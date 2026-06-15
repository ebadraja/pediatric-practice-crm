import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'
import {
  encryptMessageContent,
  previewText,
} from '@/lib/messaging/serialize'
import { resolveWebChatPatient } from '@/lib/messaging/patientMatcher'
import { getOrCreatePatientConversation } from '@/lib/messaging/portalAuth'
import { webchatMessageBody } from '@/lib/messaging/webchatSchemas'
import {
  getWebchatSessionFromCookies,
  setWebchatSessionCookie,
} from '@/lib/messaging/webchatSession'
import { normalizePhone } from '@/lib/messaging/portalAuth'
import { isWithinBusinessHours } from '@/lib/messaging/businessHours'

export const dynamic = 'force-dynamic'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 20
const recentPosts = new Map<string, number[]>()

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const hits = (recentPosts.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  if (hits.length >= RATE_LIMIT_MAX) return true
  hits.push(now)
  recentPosts.set(key, hits)
  return false
}

export async function GET(request: NextRequest) {
  try {
    const session = await getWebchatSessionFromCookies()
    if (!session) {
      return NextResponse.json({ messages: [], conversationId: null })
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: session.conversationId },
      include: {
        patient: { select: { phone: true, parentPhone: true } },
      },
    })

    if (!conversation) {
      return NextResponse.json({ messages: [], conversationId: null })
    }

    const patientPhone = conversation.patient.phone ?? conversation.patient.parentPhone ?? ''
    if (normalizePhone(patientPhone) !== normalizePhone(session.phone)) {
      return NextResponse.json({ error: 'Session mismatch' }, { status: 403 })
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId: conversation.id,
        isInternalNote: false,
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    })

    return NextResponse.json({
      conversationId: conversation.id,
      messages: messages.map((m) => ({
        id: m.id,
        senderType: m.senderType,
        channel: m.channel,
        content: decrypt(m.content),
        createdAt: m.createdAt,
      })),
    })
  } catch (error) {
    console.error('[GET /api/webchat/message]', error)
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
    }

    const body = await request.json()
    const parsed = webchatMessageBody.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { visitorName, phone, reason, content } = parsed.data
    const phoneKey = normalizePhone(phone)
    if (isRateLimited(`phone:${phoneKey}`)) {
      return NextResponse.json({ error: 'Too many messages from this number.' }, { status: 429 })
    }

    const settings = await prisma.settings.findFirst({
      select: { messagingBusinessHours: true, messagingEnabled: true },
    })
    if (settings?.messagingEnabled === false) {
      return NextResponse.json({ error: 'Messaging is temporarily unavailable.' }, { status: 503 })
    }

    const online = isWithinBusinessHours(settings?.messagingBusinessHours as never)
    // Offline mode still accepts messages per requirements

    const { patientId } = await resolveWebChatPatient(visitorName, phone)
    let conversation = await prisma.conversation.findUnique({ where: { patientId } })
    if (!conversation) {
      conversation = await getOrCreatePatientConversation(patientId, reason)
    } else if (reason && !conversation.reason) {
      const { resolveInboxForReason } = await import('@/lib/messaging/router')
      const assignedInboxId = await resolveInboxForReason(reason)
      conversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: { reason, assignedInboxId },
      })
    }

    const now = new Date()
    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId: conversation!.id,
          senderType: 'PATIENT',
          channel: 'WEB_CHAT',
          content: encryptMessageContent(content),
          contentType: 'TEXT',
          deliveryStatus: 'DELIVERED',
          metadata: {
            visitorName,
            source: 'webchat-widget',
            offlineSubmission: !online,
          },
        },
      })

      await tx.conversation.update({
        where: { id: conversation!.id },
        data: {
          status: 'OPEN',
          lastMessageAt: now,
          lastMessagePreview: previewText(content),
          unreadCount: { increment: 1 },
        },
      })

      return created
    })

    const sessionToken = await setWebchatSessionCookie(conversation!.id, phoneKey)

    return NextResponse.json(
      {
        id: message.id,
        conversationId: conversation!.id,
        sessionToken,
        senderType: message.senderType,
        channel: message.channel,
        content,
        createdAt: message.createdAt,
        isOnline: online,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('[POST /api/webchat/message]', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
