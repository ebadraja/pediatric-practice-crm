/**
 * GET /api/email/unsubscribe?token=<jwt>
 * Processes a signed unsubscribe token and creates an Unsubscribe record.
 * Redirects to a confirmation page on success.
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const token = searchParams.get('token')
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/unsubscribed?error=missing_token`)
  }

  try {
    const secret = process.env.NEXTAUTH_SECRET ?? process.env.EMAIL_TOKEN_SECRET
    if (!secret) throw new Error('No signing secret configured')

    const key  = new TextEncoder().encode(secret)
    const { payload } = await jwtVerify(token, key)

    if (payload.purpose !== 'unsubscribe' || typeof payload.patientId !== 'string') {
      return NextResponse.redirect(`${baseUrl}/unsubscribed?error=invalid_token`)
    }

    const patientId = payload.patientId

    // Look up patient to get email (for the unsubscribe record)
    const patient = await prisma.patient.findUnique({
      where:  { id: patientId },
      select: { id: true, parentEmail: true, email: true },
    })
    if (!patient) {
      return NextResponse.redirect(`${baseUrl}/unsubscribed?error=not_found`)
    }

    const rawEmail = patient.parentEmail ?? patient.email ?? ''

    // Idempotent: upsert the unsubscribe record
    await prisma.unsubscribe.upsert({
      where:  { patientId },
      create: { patientId, email: rawEmail, reason: 'user_clicked_unsubscribe' },
      update: { reason: 'user_clicked_unsubscribe' },
    })

    // Notify admins
    const admins = await prisma.user.findMany({
      where:  { role: 'ADMIN', isActive: true },
      select: { id: true },
    })
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId:    admin.id,
          type:      'warning',
          title:     'Patient Unsubscribed from Emails',
          message:   'A patient clicked the unsubscribe link in an email.',
          icon:      'alert',
          entityType: 'email_log',
          actionUrl: `/patients/${patientId}`,
        },
      })
    }

    console.log(`[email-unsubscribe] patientId=${patientId} unsubscribed`)
    return NextResponse.redirect(`${baseUrl}/unsubscribed?success=1`)
  } catch (err) {
    console.error('[email-unsubscribe] token error:', (err as Error).message)
    return NextResponse.redirect(`${baseUrl}/unsubscribed?error=invalid_token`)
  }
}
