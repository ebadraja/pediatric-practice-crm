import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

// ─── Vapi payload types ────────────────────────────────────────────────────────

interface VapiCustomer {
  name?: string
  number?: string
  email?: string
}

interface VapiCall {
  id: string
  type?: "webCall" | "inboundPhoneCall" | "outboundPhoneCall"
  customer?: VapiCustomer
  startedAt?: string
  endedAt?: string
  metadata?: Record<string, unknown>
}

interface VapiMessage {
  role: "user" | "assistant" | "system" | "bot" | "tool"
  content?: string
  message?: string
  time?: number
  secondsFromStart?: number
}

interface VapiArtifact {
  messages?: VapiMessage[]
  transcript?: string
  recordingUrl?: string
  stereoRecordingUrl?: string
}

interface VapiEndOfCallReport {
  type: "end-of-call-report"
  call: VapiCall
  transcript?: string
  summary?: string
  messages?: VapiMessage[]
  recordingUrl?: string
  endedReason?: string
  artifact?: VapiArtifact
}

interface VapiWebhookBody {
  message: VapiEndOfCallReport | { type: string }
}

// ─── Inference helpers ─────────────────────────────────────────────────────────

function inferTopic(text: string): "APPOINTMENT" | "PRICING" | "INSURANCE" | "HOURS" | "SERVICES" | "LOCATION" | "OTHER" {
  const t = text.toLowerCase()
  if (/\b(appointment|schedule|book|reschedule|cancel|visit|checkup|check-up|well.child)\b/.test(t)) return "APPOINTMENT"
  if (/\b(insurance|coverage|copay|co-pay|deductible|medicaid|medicare|tricare|billing|claim)\b/.test(t)) return "INSURANCE"
  if (/\b(price|cost|fee|charge|payment|pay|rate|afford)\b/.test(t)) return "PRICING"
  if (/\b(hours|open|close|closing|available|when|weekend|saturday|sunday)\b/.test(t)) return "HOURS"
  if (/\b(location|address|direction|where|map|park|find you|nearest)\b/.test(t)) return "LOCATION"
  if (/\b(service|treatment|doctor|physician|specialist|vaccine|immunization|sick|wellness|pediatric|developmental)\b/.test(t)) return "SERVICES"
  return "OTHER"
}

type ChatOutcomeType = "IN_PROGRESS" | "BOOKED" | "INFO_PROVIDED" | "ESCALATED_TO_CALL" | "LEAD_CAPTURED" | "ABANDONED"

function inferOutcome(summary: string, transcript: string, endedReason?: string, messageCount?: number): ChatOutcomeType {
  const combined = `${summary} ${transcript}`.toLowerCase()
  if (/\b(booked|scheduled|confirmed|appointment.*set|set.*appointment)\b/.test(combined)) return "BOOKED"
  if (/\b(transfer|escalat|speak with someone|connect you|human agent|call you back|nurse)\b/.test(combined)) return "ESCALATED_TO_CALL"
  if (/\b(email.*sent|confirmation.*sent|follow.up|we.ll.*contact|reach out)\b/.test(combined) ||
      /\b(name.*phone|contact.*info|left.*details)\b/.test(combined)) return "LEAD_CAPTURED"
  if (
    endedReason === "silence-timed-out" ||
    endedReason === "voicemail" ||
    (messageCount !== undefined && messageCount <= 2)
  ) return "ABANDONED"
  return "INFO_PROVIDED"
}

// ─── Message mapper ────────────────────────────────────────────────────────────

interface MappedMessage {
  type: "bot" | "visitor"
  content: string
  timestamp: string
  senderName?: string
}

function mapMessages(vapiMessages: VapiMessage[]): MappedMessage[] {
  return vapiMessages
    .filter(m => m.role !== "system" && m.role !== "tool" && (m.content || m.message))
    .map(m => ({
      type: (m.role === "assistant" || m.role === "bot" ? "bot" : "visitor") as "bot" | "visitor",
      content: (m.content ?? m.message ?? "").trim(),
      timestamp: m.time ? new Date(m.time).toISOString() : new Date().toISOString(),
    }))
    .filter(m => m.content.length > 0)
}

// ─── Core processor (exported for test route) ──────────────────────────────────

export async function processVapiEndOfCall(
  report: VapiEndOfCallReport,
  requestIp: string | null,
): Promise<{ chatLogId: string; alreadyExists?: boolean }> {
  const call = report.call

  // Dedup — Vapi may retry on non-2xx
  const existing = await prisma.chatLog.findUnique({
    where:  { sessionId: call.id },
    select: { id: true },
  })
  if (existing) return { chatLogId: existing.id, alreadyExists: true }

  // Prefer artifact data (richer) then fall back to top-level fields
  const rawMessages: VapiMessage[] = report.artifact?.messages ?? report.messages ?? []
  const transcript  = report.artifact?.transcript ?? report.transcript ?? ""
  const summary     = report.summary ?? ""

  const mapped      = mapMessages(rawMessages)
  const topic       = inferTopic(transcript || summary)
  const outcome     = inferOutcome(summary, transcript, report.endedReason, mapped.length)

  const visitorName  = call.customer?.name  ?? null
  const visitorPhone = call.customer?.number ?? null
  const visitorEmail = call.customer?.email  ?? null

  const startTime = call.startedAt ? new Date(call.startedAt) : new Date()
  const endTime   = call.endedAt   ? new Date(call.endedAt)   : null

  // Auto-link existing patient
  let patientId: string | null = null
  if (visitorPhone) {
    const m = await prisma.patient.findFirst({ where: { phone: visitorPhone }, select: { id: true } })
    if (m) patientId = m.id
  }
  if (!patientId && visitorEmail) {
    const m = await prisma.patient.findFirst({
      where: { email: { equals: visitorEmail, mode: "insensitive" } },
      select: { id: true },
    })
    if (m) patientId = m.id
  }

  const chatLog = await prisma.chatLog.create({
    data: {
      sessionId:        call.id,
      visitorName,
      visitorEmail,
      visitorPhone,
      startTime,
      endTime,
      messageCount:     mapped.length,
      topic,
      outcome,
      messages:         JSON.parse(JSON.stringify(mapped)),
      summary:          summary || null,
      sourcePage:       null,
      deviceType:       call.type === "webCall" ? "Desktop" : null,
      browser:          null,
      leadCaptured:     outcome === "LEAD_CAPTURED",
      appointmentBooked: outcome === "BOOKED",
      patientId,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId:    null,
      action:    "CREATE",
      entity:    "chat_log",
      entityId:  chatLog.id,
      changes:   { source: "vapi_webhook", vapiCallId: call.id, callType: call.type ?? "webCall" },
      ipAddress: requestIp,
      userAgent: "Vapi-Webhook",
      timestamp: new Date(),
    },
  })

  return { chatLogId: chatLog.id }
}

// ─── POST /api/webhooks/vapi ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Log every incoming event so we can see exactly what Vapi sends
  const eventType = (body?.message as Record<string, unknown>)?.type ?? body?.type ?? "unknown"
  console.log("[VAPI WEBHOOK] event type:", eventType)
  console.log("[VAPI WEBHOOK] full body:", JSON.stringify(body, null, 2))

  const msg = body?.message as Record<string, unknown> | undefined

  // Handle top-level format (some Vapi versions send without wrapping in `message`)
  const payload = msg ?? body
  const type = (payload?.type as string) ?? "unknown"

  // For conversation-update / chat events — Vapi sends these during and after chat sessions
  if (type === "conversation-update" || type === "end-of-call-report") {
    // Normalise: build a VapiEndOfCallReport-shaped object from whatever arrived
    const call = (payload?.call as VapiCall) ?? { id: (payload?.sessionId as string) ?? `chat_${Date.now()}` }
    if (!call.id) {
      return NextResponse.json({ error: "Missing call id" }, { status: 400 })
    }

    // For conversation-update, only save when the chat is finished (status === "ended")
    if (type === "conversation-update") {
      const status = (payload?.status as string) ?? ""
      if (status !== "ended" && status !== "complete") {
        return NextResponse.json({ received: true, processed: false, reason: "conversation still in progress" })
      }
    }

    const report: VapiEndOfCallReport = {
      type:        "end-of-call-report",
      call,
      transcript:  payload?.transcript as string | undefined,
      summary:     payload?.summary as string | undefined,
      messages:    payload?.messages as VapiMessage[] | undefined,
      endedReason: payload?.endedReason as string | undefined,
      artifact:    payload?.artifact as VapiArtifact | undefined,
    }

    try {
      const ip     = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? null
      const result = await processVapiEndOfCall(report, ip)
      if (result.alreadyExists) {
        return NextResponse.json({ received: true, processed: false, reason: "duplicate", chatLogId: result.chatLogId })
      }
      return NextResponse.json({ received: true, processed: true, chatLogId: result.chatLogId }, { status: 201 })
    } catch (err) {
      console.error("[POST /api/webhooks/vapi]", err)
      return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
    }
  }

  // All other event types (status-update, speech-update, etc.) — just acknowledge
  return NextResponse.json({ received: true, processed: false, type })
}

// ─── GET /api/webhooks/vapi (health check) ────────────────────────────────────

export async function GET() {
  return NextResponse.json({ status: "Vapi webhook receiver is active", timestamp: new Date().toISOString() })
}
