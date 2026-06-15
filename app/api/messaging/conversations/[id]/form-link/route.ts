import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireStaffSession } from '@/lib/messaging/session'
import { appendSystemMessage } from '@/lib/messaging/systemMessages'
import { serializeMessage } from '@/lib/messaging/serialize'

export const dynamic = 'force-dynamic'

const formLinkBody = z.object({
  url: z.string().url(),
  title: z.string().min(1).max(200).default('Patient intake form'),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const staff = await requireStaffSession()
    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: conversationId } = await params
    const body = await request.json()
    const parsed = formLinkBody.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, patientId: true },
    })
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const { url, title } = parsed.data
    const content = `${title}\n${url}`

    const message = await appendSystemMessage({
      patientId: conversation.patientId,
      content,
      contentType: 'FORM_LINK',
      metadata: { url, title, sentById: staff.id, kind: 'hippatizer_form_link' },
    })

    const full = await prisma.message.findUnique({
      where: { id: message.id },
      include: { sender: { select: { id: true, firstName: true, lastName: true } } },
    })

    await prisma.auditLog.create({
      data: {
        userId: staff.id,
        action: 'MESSAGE_SENT',
        entity: 'message',
        entityId: message.id,
        changes: { conversationId, contentType: 'FORM_LINK', url },
      },
    })

    return NextResponse.json(serializeMessage(full!), { status: 201 })
  } catch (error) {
    console.error('[POST /api/messaging/conversations/[id]/form-link]', error)
    return NextResponse.json({ error: 'Failed to send form link' }, { status: 500 })
  }
}
