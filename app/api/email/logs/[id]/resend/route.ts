import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ── POST /api/email/logs/:id/resend ──────────────────────────────────────────
// Resets a FAILED REMINDER-type email log back to QUEUED so the scheduler retries it.

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const log = await prisma.emailLog.findUnique({
      where:  { id },
      select: { id: true, status: true, type: true, patientId: true },
    })

    if (!log) {
      return NextResponse.json({ error: 'Email log not found' }, { status: 404 })
    }
    if (log.status !== 'FAILED') {
      return NextResponse.json({ error: 'Only FAILED emails can be resent' }, { status: 409 })
    }
    if (log.type !== 'REMINDER') {
      return NextResponse.json({ error: 'Only transactional (reminder) emails can be resent' }, { status: 409 })
    }

    // Check patient is not unsubscribed
    const unsub = await prisma.unsubscribe.findUnique({ where: { patientId: log.patientId } })
    if (unsub) {
      return NextResponse.json({ error: 'Patient is unsubscribed' }, { status: 409 })
    }

    const updated = await prisma.emailLog.update({
      where: { id },
      data:  { status: 'QUEUED', errorMessage: null, sentAt: null },
    })

    prisma.auditLog.create({
      data: {
        userId:  session.user.id, action: 'UPDATE',
        entity:  'email_log',    entityId: id,
        changes: { status: 'QUEUED', reason: 'admin_resend' },
      },
    }).catch(() => {})

    return NextResponse.json({ success: true, id: updated.id, status: updated.status })
  } catch (error) {
    console.error('[POST /api/email/logs/[id]/resend]', error)
    return NextResponse.json({ error: 'Failed to resend email' }, { status: 500 })
  }
}
