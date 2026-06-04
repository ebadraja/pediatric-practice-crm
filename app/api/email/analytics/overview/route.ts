import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/lib/generated/prisma/client'

export const dynamic = 'force-dynamic'

// ── GET /api/email/analytics/overview ────────────────────────────────────────
// Query params: dateFrom, dateTo (default: last 30 days)

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = req.nextUrl
    const now       = new Date()
    const dateFrom  = searchParams.get('dateFrom')
      ? new Date(searchParams.get('dateFrom')!)
      : new Date(now.getTime() - 30 * 24 * 3600_000)
    const dateTo    = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : now

    const where: Prisma.EmailLogWhereInput = {
      createdAt: { gte: dateFrom, lte: dateTo },
    }

    const [total, sent, delivered, opened, clicked, bounced, failed, unsubscribed] = await Promise.all([
      prisma.emailLog.count({ where }),
      prisma.emailLog.count({ where: { ...where, status: 'SENT'         } }),
      prisma.emailLog.count({ where: { ...where, status: 'DELIVERED'    } }),
      prisma.emailLog.count({ where: { ...where, status: 'OPENED'       } }),
      prisma.emailLog.count({ where: { ...where, status: 'CLICKED'      } }),
      prisma.emailLog.count({ where: { ...where, status: 'BOUNCED'      } }),
      prisma.emailLog.count({ where: { ...where, status: 'FAILED'       } }),
      prisma.emailLog.count({ where: { ...where, status: 'UNSUBSCRIBED' } }),
    ])

    const deliveryBase = sent + delivered + opened + clicked || 1
    const openBase     = delivered + opened + clicked || 1

    // Daily breakdown for chart
    const dailyRaw = await prisma.emailLog.groupBy({
      by:      ['createdAt'],
      where,
      _count:  { id: true },
      orderBy: { createdAt: 'asc' },
    })

    // Bucket by day
    const dailyMap: Record<string, number> = {}
    for (const row of dailyRaw) {
      const day = row.createdAt.toISOString().slice(0, 10)
      dailyMap[day] = (dailyMap[day] ?? 0) + row._count.id
    }
    const dailyTrend = Object.entries(dailyMap).map(([date, count]) => ({ date, count }))

    return NextResponse.json({
      period:      { from: dateFrom.toISOString(), to: dateTo.toISOString() },
      totals:      { total, sent, delivered, opened, clicked, bounced, failed, unsubscribed },
      rates: {
        deliveryRate:    Math.round((delivered / deliveryBase) * 100),
        openRate:        Math.round((opened    / openBase)     * 100),
        clickToOpenRate: Math.round((clicked   / (opened || 1)) * 100),
        bounceRate:      Math.round((bounced   / deliveryBase) * 100),
      },
      dailyTrend,
    })
  } catch (error) {
    console.error('[GET /api/email/analytics/overview]', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
