import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import {
  advanceSessionToDobStep,
  attachSmsCodeToSession,
  completePortalVerification,
  createPendingPortalSession,
  findPatientByPhone,
  generateSmsCode,
  getPortalSessionByRawToken,
  isSameDateOfBirth,
  setPortalSessionCookie,
  verifySmsCodeForSession,
} from '@/lib/messaging/portalAuth'
import { portalAuthBody } from '@/lib/messaging/portalSchemas'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = portalAuthBody.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const payload = parsed.data

    if (payload.action === 'request_code') {
      const patient = await findPatientByPhone(payload.phone)
      if (!patient) {
        return NextResponse.json(
          { error: 'No patient found for this phone number. Please call the office.' },
          { status: 404 },
        )
      }

      const code = generateSmsCode()
      const { rawToken, sessionId } = await createPendingPortalSession(patient.id, payload.phone)
      await attachSmsCodeToSession(sessionId, code)

      // Phase 1: SMS stub — log code server-side; Twilio wired in M8
      console.log(`[portal] verification code for ${patient.id}: ${code}`)

      const response: Record<string, string> = {
        sessionToken: rawToken,
        message: 'Verification code sent.',
      }

      // Dev-only helper for testing without SMS
      if (process.env.NODE_ENV === 'development') {
        response.devCode = code
      }

      return NextResponse.json(response)
    }

    if (payload.action === 'verify_code') {
      const session = await getPortalSessionByRawToken(payload.sessionToken)
      if (!session) {
        return NextResponse.json({ error: 'Session expired. Please start again.' }, { status: 401 })
      }

      const valid = await verifySmsCodeForSession(session.id, payload.code)
      if (!valid) {
        return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 })
      }

      await advanceSessionToDobStep(session.id)
      return NextResponse.json({ success: true, nextStep: 'dob' })
    }

    if (payload.action === 'verify_dob') {
      const session = await getPortalSessionByRawToken(payload.sessionToken)
      if (!session) {
        return NextResponse.json({ error: 'Session expired. Please start again.' }, { status: 401 })
      }

      const patient = await prisma.patient.findUnique({
        where: { id: session.patientId },
        select: { dateOfBirth: true },
      })
      if (!patient || !isSameDateOfBirth(patient.dateOfBirth, payload.dateOfBirth)) {
        return NextResponse.json({ error: 'Date of birth does not match our records' }, { status: 403 })
      }

      await completePortalVerification(session.id)
      await setPortalSessionCookie(payload.sessionToken)

      await prisma.auditLog.create({
        data: {
          action: 'PORTAL_ACCESS',
          entity: 'patient_portal',
          entityId: session.patientId,
        },
      })

      return NextResponse.json({ success: true, redirect: '/portal/chat' })
    }

    if (payload.action === 'magic_link_exchange') {
      const session = await getPortalSessionByRawToken(payload.token)
      if (!session) {
        return NextResponse.json({ error: 'Invalid or expired link' }, { status: 401 })
      }

      const patient = await prisma.patient.findUnique({
        where: { id: session.patientId },
        select: { dateOfBirth: true },
      })
      if (!patient || !isSameDateOfBirth(patient.dateOfBirth, payload.dateOfBirth)) {
        return NextResponse.json({ error: 'Date of birth does not match our records' }, { status: 403 })
      }

      await completePortalVerification(session.id)
      await setPortalSessionCookie(payload.token)

      await prisma.auditLog.create({
        data: {
          action: 'PORTAL_ACCESS',
          entity: 'patient_portal',
          entityId: session.patientId,
        },
      })

      return NextResponse.json({ success: true, redirect: '/portal/chat' })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('[POST /api/portal/auth]', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}
