import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"

export const dynamic = "force-dynamic"

// ── GET /api/intake-forms/new-count ───────────────────────────────────────────
// Count of newly received intake forms (status RECEIVED, not soft-deleted).
// Powers the sidebar badge. Respects the same view access control as the list
// endpoint — returns 0 for users without intake-form view permission.

async function checkAccess(session: any) {
  if (!session?.user?.id) return false
  if (session.user.role === "ADMIN") return true
  const ac = await prisma.intakeFormAccessControl.findUnique({
    where: { userId: session.user.id },
  })
  return !!ac?.canView
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!(await checkAccess(session))) {
      // No view permission — surface no badge rather than an error.
      return NextResponse.json({ count: 0 })
    }

    const count = await prisma.intakeForm.count({
      where: { status: "RECEIVED", deletedAt: null },
    })

    return NextResponse.json({ count })
  } catch (error) {
    console.error("[GET /api/intake-forms/new-count]", error)
    return NextResponse.json({ error: "Failed to fetch count" }, { status: 500 })
  }
}
