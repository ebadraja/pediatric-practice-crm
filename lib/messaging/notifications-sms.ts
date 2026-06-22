import prisma from '@/lib/prisma'
import { findPatientByPhone, createMagicLinkSession } from '@/lib/messaging/portalAuth'
import { getSmsProviderConfig } from '@/lib/messaging/smsSettings'
import { queueSms } from '@/services/messageQueue'

const ACTIVE_SESSION_MS = 5 * 60 * 1000

async function getPortalBaseUrl(): Promise<string> {
  const settings = await prisma.settings.findFirst({
    select: { portalConfig: true },
  })
  const portalConfig = (settings?.portalConfig ?? {}) as { baseUrl?: string }
  return (
    portalConfig.baseUrl?.replace(/\/$/, '') ??
    process.env.NEXTAUTH_URL?.replace(/\/$/, '') ??
    'https://srv1217658.hstgr.cloud'
  )
}

async function isPatientActiveInPortal(patientId: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - ACTIVE_SESSION_MS)
  const session = await prisma.patientPortalSession.findFirst({
    where: {
      patientId,
      verifiedAt: { not: null, gte: cutoff },
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  })
  return session !== null
}

async function isSmsOptedOut(patientId: string): Promise<boolean> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { smsOptOut: true },
  })
  if (patient?.smsOptOut) return true

  const optOut = await prisma.sMSOptOut.findFirst({
    where: {
      patientId,
      isOptedOut: true,
    },
    select: { id: true },
  })
  return optOut !== null
}

function resolvePatientPhone(patient: {
  phone: string | null
  parentPhone: string | null
}): string | null {
  return patient.phone ?? patient.parentPhone ?? null
}

/**
 * Send a generic SMS notification when staff replies (no PHI in body).
 */
export async function notifyPatientOfNewMessage({
  patientId,
  conversationId,
}: {
  patientId: string
  conversationId: string
  staffName?: string
}): Promise<void> {
  const config = await getSmsProviderConfig()
  if (!config.sendNotificationOnStaffReply) {
    return
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { phone: true, parentPhone: true },
  })
  if (!patient) return

  const phone = resolvePatientPhone(patient)
  if (!phone) return

  if (await isSmsOptedOut(patientId)) {
    return
  }

  if (await isPatientActiveInPortal(patientId)) {
    return
  }

  const rawToken = await createMagicLinkSession(patientId, phone)
  const portalBase = await getPortalBaseUrl()
  const link = `${portalBase}/portal/chat/${rawToken}`

  const body =
    `You have a new message from Kids 0-18 Pediatrics. Read it here: ${link}`

  await queueSms({
    to: phone,
    body,
    type: 'notification',
    patientId,
    conversationId,
  })
}

export type SmsOptKeyword = 'stop' | 'start'

const STOP_KEYWORDS = new Set(['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'])
const START_KEYWORDS = new Set(['START', 'SUBSCRIBE', 'UNSTOP'])

export function classifySmsKeyword(body: string): SmsOptKeyword | null {
  const normalized = body.trim().toUpperCase()
  if (STOP_KEYWORDS.has(normalized)) return 'stop'
  if (START_KEYWORDS.has(normalized)) return 'start'
  return null
}

/**
 * Handle STOP/START opt-out keywords from inbound Twilio SMS.
 */
export async function handleSmsOptKeyword(
  phoneE164: string,
  keyword: SmsOptKeyword,
): Promise<void> {
  const patient = await findPatientByPhone(phoneE164)
  if (!patient) {
    console.log(`[sms-webhook] ${keyword} from unknown phone (no patient match)`)
    return
  }

  if (keyword === 'stop') {
    const existing = await prisma.sMSOptOut.findFirst({
      where: { patientId: patient.id, phoneNumber: phoneE164 },
    })

    if (existing) {
      await prisma.sMSOptOut.update({
        where: { id: existing.id },
        data: {
          isOptedOut: true,
          optedOutAt: new Date(),
          optedInAt: null,
        },
      })
    } else {
      await prisma.sMSOptOut.create({
        data: {
          patientId: patient.id,
          phoneNumber: phoneE164,
          isOptedOut: true,
          optedOutAt: new Date(),
        },
      })
    }

    await prisma.patient.update({
      where: { id: patient.id },
      data: { smsOptOut: true },
    })
    return
  }

  const existing = await prisma.sMSOptOut.findFirst({
    where: { patientId: patient.id, phoneNumber: phoneE164 },
  })

  if (existing) {
    await prisma.sMSOptOut.update({
      where: { id: existing.id },
      data: {
        isOptedOut: false,
        optedInAt: new Date(),
      },
    })
  } else {
    await prisma.sMSOptOut.create({
      data: {
        patientId: patient.id,
        phoneNumber: phoneE164,
        isOptedOut: false,
        optedInAt: new Date(),
        optedOutAt: new Date(),
      },
    })
  }

  await prisma.patient.update({
    where: { id: patient.id },
    data: { smsOptOut: false },
  })
}
