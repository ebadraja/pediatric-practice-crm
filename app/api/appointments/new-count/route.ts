import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"

export const dynamic = "force-dynamic"

// ── GET /api/appointments/new-count ───────────────────────────────────────────
// Count of new (unhandled) upcoming appointments: status SCHEDULED with a
// start time in the future. Powers the sidebar badge. Read-only; decreases as
// staff confirm / complete / cancel / reschedule appointments (which move them
// out of the SCHEDULED state).

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const count = await prisma.appointment.count({
      where: {
        status: "SCHEDULED",
        startTime: { gte: new Date() },
      },
    })

    return NextResponse.json({ count })
  } catch (error) {
    console.error("[GET /api/appointments/new-count]", error)
    return NextResponse.json({ error: "Failed to fetch count" }, { status: 500 })
  }
}
