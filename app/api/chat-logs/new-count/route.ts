import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"

export const dynamic = "force-dynamic"

// ── GET /api/chat-logs/new-count ──────────────────────────────────────────────
// Count of unreviewed chat logs (isReviewed = false). Powers the sidebar badge.
// Read-only; decreases as staff mark chats reviewed.

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const count = await prisma.chatLog.count({
      where: { isReviewed: false },
    })

    return NextResponse.json({ count })
  } catch (error) {
    console.error("[GET /api/chat-logs/new-count]", error)
    return NextResponse.json({ error: "Failed to fetch count" }, { status: 500 })
  }
}
