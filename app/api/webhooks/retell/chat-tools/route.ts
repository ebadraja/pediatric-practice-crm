import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { decrypt } from "@/lib/crypto"
import { verifyRetellSignature } from "@/lib/retell/signature"
import {
  toolCreateCallbackRequest,
  toolSendIntakeForms,
  toolSubmitRefillRequest,
  toolVerifyInsurance,
} from "@/lib/agent-tools"

export const dynamic = "force-dynamic"

/**
 * Tools the GIGI website chat agent may call. Deliberately excludes booking,
 * cancellation, and patient lookup: website visitors are anonymous, and GIGI
 * no longer takes bookings.
 */
const CHAT_TOOLS: Record<string, (args: Record<string, unknown>) => string | Promise<string>> = {
  verify_insurance: toolVerifyInsurance,
  create_callback_request: toolCreateCallbackRequest,
  submit_refill_request: toolSubmitRefillRequest,
  send_intake_forms: toolSendIntakeForms,
}

function textResponse(body: string, status = 200) {
  return new NextResponse(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } })
}

// POST /api/webhooks/retell/chat-tools — Retell custom function calls for GIGI.
// Configure each custom function in Retell with this URL, method POST, and the
// default payload ({ name, args, ... }).
export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  const settings = await prisma.settings.findFirst({ select: { retellApiKey: true } })
  const apiKey = settings?.retellApiKey ? decrypt(settings.retellApiKey) : ""
  if (!apiKey) {
    return NextResponse.json({ error: "Retell is not configured" }, { status: 503 })
  }
  if (!verifyRetellSignature(rawBody, request.headers.get("x-retell-signature"), apiKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { name?: unknown; args?: unknown }
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const name = typeof body.name === "string" ? body.name : ""
  const args =
    body.args && typeof body.args === "object" && !Array.isArray(body.args)
      ? (body.args as Record<string, unknown>)
      : {}

  const tool = CHAT_TOOLS[name]
  if (!tool) {
    console.warn(`[RETELL CHAT TOOL] unknown or disallowed tool: ${name}`)
    return textResponse("That action isn't available in website chat. Please call us at (253) 400-4479.")
  }

  try {
    return textResponse(await tool(args))
  } catch (err) {
    console.error(`[RETELL CHAT TOOL] ${name} failed:`, err)
    return textResponse("Something went wrong. Please try again or call us directly.")
  }
}
