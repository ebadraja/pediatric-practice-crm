import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"

export const dynamic = "force-dynamic"

// ── GET /api/call-logs/new-count ──────────────────────────────────────────────
// Count of unreviewed call logs (isReviewed = false). Powers the sidebar badge.
// Read-only; decreases as staff mark calls reviewed via PATCH /api/call-logs/[id].

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const count = await prisma.callLog.count({
      where: { isReviewed: false },
    })

    return NextResponse.json({ count })
  } catch (error) {
    console.error("[GET /api/call-logs/new-count]", error)
    return NextResponse.json({ error: "Failed to fetch count" }, { status: 500 })
  }
}
