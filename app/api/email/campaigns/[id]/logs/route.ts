import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ── GET /api/email/campaigns/:id/logs ────────────────────────────────────────

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id }  = await params
    const page    = Math.max(1, parseInt(req.nextUrl.searchParams.get('page')  ?? '1',  10))
    const limit   = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '50', 10)))

    const campaign = await prisma.emailCampaign.findUnique({
      where:  { id },
      select: { id: true },
    })
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where:   { campaignId: id },
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id:        true,
          status:    true,
          sentAt:    true,
          openedAt:  true,
          clickedAt: true,
          createdAt: true,
          patient: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.emailLog.count({ where: { campaignId: id } }),
    ])

    return NextResponse.json({
      data: logs.map(l => ({
        id:          l.id,
        patientName: l.patient ? `${l.patient.firstName} ${l.patient.lastName}` : 'Unknown',
        status:      l.status,
        sentAt:      l.sentAt,
        openedAt:    l.openedAt,
        clickedAt:   l.clickedAt,
        createdAt:   l.createdAt,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('[GET /api/email/campaigns/[id]/logs]', error)
    return NextResponse.json({ error: 'Failed to fetch campaign logs' }, { status: 500 })
  }
}
