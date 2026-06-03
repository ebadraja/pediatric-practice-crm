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

interface VapiStructuredData {
  callerName?: string
  patientName?: string
  patientDOB?: string
  isNewPatient?: boolean
  callIntent?: string
  appointmentType?: string
  appointmentConfirmed?: boolean
  requestedDate?: string
  requestedTime?: string
  wasEscalated?: boolean
  insuranceProvider?: string
}

interface VapiAnalysis {
  summary?: string
  structuredData?: VapiStructuredData
  successEvaluation?: string
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
  analysis?: VapiAnalysis
}

interface VapiWebhookBody {
  message: VapiEndOfCallReport | { type: string }
}

// ─── ChatLog inference helpers (unchanged) ────────────────────────────────────

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

function inferChatOutcome(summary: string, transcript: string, endedReason?: string, messageCount?: number): ChatOutcomeType {
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

// ─── CallLog inference helpers ────────────────────────────────────────────────

type CallIntentType = "APPOINTMENT_BOOKING" | "INQUIRY" | "COMPLAINT" | "SUPPORT" | "ROUTING" | "CANCELLATION" | "VERIFICATION" | "EMERGENCY" | "GENERAL"
type CallOutcomeType = "IN_PROGRESS" | "BOOKED" | "INFO_PROVIDED" | "TRANSFERRED" | "HUNG_UP" | "VOICEMAIL"
type SentimentType   = "POSITIVE" | "NEUTRAL" | "NEGATIVE"

function inferCallIntent(text: string): CallIntentType {
  const t = text.toLowerCase()
  if (/\b(emergency|urgent|911|severe|critical|life.threatening|allergic)\b/.test(t)) return "EMERGENCY"
  if (/\b(cancel|cancellation)\b/.test(t)) return "CANCELLATION"
  if (/\b(appointment|schedule|book|reschedule|visit|checkup|well.child)\b/.test(t)) return "APPOINTMENT_BOOKING"
  if (/\b(complaint|complain|unhappy|dissatisfied|wrong|mistake|error|terrible)\b/.test(t)) return "COMPLAINT"
  if (/\b(transfer|route|connect|speak with|human|operator|nurse|staff)\b/.test(t)) return "ROUTING"
  if (/\b(verify|confirm|check|look up|look me up|records)\b/.test(t)) return "VERIFICATION"
  if (/\b(support|help|assist|problem|issue|trouble|not working)\b/.test(t)) return "SUPPORT"
  if (/\b(insurance|coverage|cost|price|fee|billing|hours|location|services|doctor|provider)\b/.test(t)) return "INQUIRY"
  return "GENERAL"
}

function inferCallOutcome(summary: string, transcript: string, endedReason?: string, messageCount?: number): CallOutcomeType {
  const combined = `${summary} ${transcript}`.toLowerCase()
  if (/\b(booked|scheduled|confirmed|appointment.*set|set.*appointment)\b/.test(combined)) return "BOOKED"
  if (/\b(transfer|escalat|speak with someone|connect you|human agent|nurse)\b/.test(combined)) return "TRANSFERRED"
  if (endedReason === "voicemail") return "VOICEMAIL"
  if (endedReason === "silence-timed-out" || (messageCount !== undefined && messageCount <= 2)) return "HUNG_UP"
  return "INFO_PROVIDED"
}

function inferSentiment(transcript: string): SentimentType {
  const t = transcript.toLowerCase()
  if (/\b(thank you|great|perfect|wonderful|excellent|love|awesome|appreciate|happy|pleased|fantastic)\b/.test(t)) return "POSITIVE"
  if (/\b(frustrat|upset|annoyed|terrible|awful|horrible|angry|rude|waste|worst|never again|ridiculous)\b/.test(t)) return "NEGATIVE"
  return "NEUTRAL"
}

// ─── Phone normalizer ─────────────────────────────────────────────────────────

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "").replace(/^1(\d{10})$/, "$1")
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

// ─── Core processor ────────────────────────────────────────────────────────────

export async function processVapiEndOfCall(
  report: VapiEndOfCallReport,
  requestIp: string | null,
  isPhoneCall = true,   // true = end-of-call-report → CallLog only
                        // false = conversation-update → ChatLog only
): Promise<{ chatLogId: string | null; callLogId: string | null; alreadyExists?: boolean }> {
  const call = report.call

  // ── Shared data extraction ─────────────────────────────────────────────────
  const rawMessages: VapiMessage[] = report.artifact?.messages ?? report.messages ?? []
  const transcript   = report.artifact?.transcript ?? report.transcript ?? ""
  const summary      = report.summary ?? ""
  const recordingUrl = report.artifact?.recordingUrl ?? report.recordingUrl ?? null

  const mapped   = mapMessages(rawMessages)
  const combined = `${summary} ${transcript}`

  const visitorName  = call.customer?.name   ?? null
  const visitorPhone = call.customer?.number ?? null
  const visitorEmail = call.customer?.email  ?? null

  const startTime = call.startedAt ? new Date(call.startedAt) : new Date()
  const endTime   = call.endedAt   ? new Date(call.endedAt)   : null
  const duration  = endTime ? Math.round((endTime.getTime() - startTime.getTime()) / 1000) : null

  // ── Patient matching — 5-level cascade ────────────────────────────────────
  const sd            = report.analysis?.structuredData
  const normPhone     = visitorPhone ? normalizePhone(visitorPhone) : null
  let patientId: string | null = null

  // 1. Exact phone match
  if (!patientId && visitorPhone) {
    const m = await prisma.patient.findFirst({ where: { phone: visitorPhone }, select: { id: true } })
    if (m) patientId = m.id
  }

  // 2. Normalized phone match (strips country code / formatting)
  if (!patientId && normPhone && normPhone !== visitorPhone) {
    const all = await prisma.patient.findMany({ select: { id: true, phone: true } })
    const match = all.find(p => p.phone && normalizePhone(p.phone) === normPhone)
    if (match) patientId = match.id
  }

  // 3. Parent phone match
  if (!patientId && visitorPhone) {
    const m = await prisma.patient.findFirst({ where: { parentPhone: visitorPhone }, select: { id: true } })
    if (m) patientId = m.id
  }

  // 4. Email match
  if (!patientId && visitorEmail) {
    const m = await prisma.patient.findFirst({
      where: { email: { equals: visitorEmail, mode: "insensitive" } },
      select: { id: true },
    })
    if (m) patientId = m.id
  }

  // 5. Patient name match from Vapi structuredData (e.g. "John Smith" → search firstName + lastName)
  if (!patientId && sd?.patientName) {
    const parts = sd.patientName.trim().split(/\s+/)
    if (parts.length >= 2) {
      const firstName = parts[0]
      const lastName  = parts.slice(1).join(" ")
      const m = await prisma.patient.findFirst({
        where: {
          firstName: { equals: firstName, mode: "insensitive" },
          lastName:  { equals: lastName,  mode: "insensitive" },
        },
        select: { id: true },
      })
      if (m) patientId = m.id
    }
  }

  // ── PHONE CALL → CallLog only ──────────────────────────────────────────────
  if (isPhoneCall) {
    const existing = await prisma.callLog.findUnique({
      where: { vapiCallId: call.id }, select: { id: true },
    })
    if (existing) return { chatLogId: null, callLogId: existing.id, alreadyExists: true }

    // Prefer Vapi structuredData over regex inference
    const callIntent = (sd?.callIntent as CallIntentType | undefined)
      ?? inferCallIntent(combined)
    const callOutcome = sd?.appointmentConfirmed
      ? "BOOKED"
      : sd?.wasEscalated
      ? "TRANSFERRED"
      : inferCallOutcome(summary, transcript, report.endedReason, mapped.length)
    const sentiment   = inferSentiment(transcript)

    // Use caller name from structuredData if Vapi didn't send customer.name
    const resolvedCallerName = visitorName ?? sd?.callerName ?? null

    let callLogId: string | null = null
    try {
      const callLog = await prisma.callLog.create({
        data: {
          callerName:       resolvedCallerName,
          callerPhone:      visitorPhone ?? "unknown",
          startTime,
          endTime,
          duration,
          intent:           callIntent,
          outcome:          callOutcome,
          sentiment,
          transcript:       transcript || null,
          summary:          summary || null,
          recordingUrl,
          vapiCallId:       call.id,
          wasEscalated:     callOutcome === "TRANSFERRED",
          escalationReason: callOutcome === "TRANSFERRED" ? "Escalated via Vapi" : null,
          appointmentBooked: callOutcome === "BOOKED",
          patientId,
        },
      })
      callLogId = callLog.id
    } catch (err) {
      console.error("[VAPI WEBHOOK] CallLog write failed:", err)
    }

    // Audit
    await prisma.auditLog.create({
      data: {
        userId: null, action: "CREATE", entity: "call_log", entityId: callLogId ?? call.id,
        changes: { source: "vapi_webhook", vapiCallId: call.id, callType: call.type ?? "webCall" },
        ipAddress: requestIp, userAgent: "Vapi-Webhook", timestamp: new Date(),
      },
    })

    // Notifications
    try {
      const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } })
      const callerLabel   = visitorName ?? visitorPhone ?? "Unknown caller"
      const durationLabel = duration ? `${Math.floor(duration / 60)}m ${duration % 60}s` : null
      let title   = "New Call Received"
      let message = `${callerLabel}${durationLabel ? ` · ${durationLabel}` : ""} · ${callIntent.replace(/_/g, " ").toLowerCase()}`
      let icon    = "phone"
      if (callOutcome === "BOOKED") {
        title = "Appointment Booked via Call"
        message = `${callerLabel} booked an appointment${durationLabel ? ` · ${durationLabel}` : ""}`
        icon  = "check"
      } else if (callOutcome === "TRANSFERRED") {
        title = "Call Escalated to Staff"
        message = `${callerLabel} requested a human agent${durationLabel ? ` · ${durationLabel}` : ""}`
        icon  = "alert"
      } else if (callOutcome === "HUNG_UP" || callOutcome === "VOICEMAIL") {
        title = callOutcome === "VOICEMAIL" ? "Voicemail Left" : "Missed Call"
        icon  = "alert"
      }
      for (const admin of admins) {
        await prisma.notification.create({
          data: { userId: admin.id, type: "call_received", title, message, icon,
            entityType: "call_log", entityId: callLogId ?? undefined, actionUrl: "/call-logs" },
        })
      }
    } catch (err) {
      console.error("[VAPI WEBHOOK] Notification failed:", err)
    }

    return { chatLogId: null, callLogId }
  }

  // ── CHATBOT CONVERSATION → ChatLog only ────────────────────────────────────
  const existing = await prisma.chatLog.findUnique({
    where: { sessionId: call.id }, select: { id: true },
  })
  if (existing) return { chatLogId: existing.id, callLogId: null, alreadyExists: true }

  const topic       = inferTopic(combined)
  const chatOutcome = inferChatOutcome(summary, transcript, report.endedReason, mapped.length)

  const chatLog = await prisma.chatLog.create({
    data: {
      sessionId:         call.id,
      visitorName,
      visitorEmail,
      visitorPhone,
      startTime,
      endTime,
      messageCount:      mapped.length,
      topic,
      outcome:           chatOutcome,
      messages:          JSON.parse(JSON.stringify(mapped)),
      summary:           summary || null,
      sourcePage:        null,
      deviceType:        call.type === "webCall" ? "Desktop" : null,
      browser:           null,
      leadCaptured:      chatOutcome === "LEAD_CAPTURED",
      appointmentBooked: chatOutcome === "BOOKED",
      patientId,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: null, action: "CREATE", entity: "chat_log", entityId: chatLog.id,
      changes: { source: "vapi_webhook", vapiCallId: call.id, callType: call.type ?? "webCall" },
      ipAddress: requestIp, userAgent: "Vapi-Webhook", timestamp: new Date(),
    },
  })

  return { chatLogId: chatLog.id, callLogId: null }
}

// ─── POST /api/webhooks/vapi ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const eventType = (body?.message as Record<string, unknown>)?.type ?? body?.type ?? "unknown"
  console.log("[VAPI WEBHOOK] event type:", eventType)
  console.log("[VAPI WEBHOOK] full body:", JSON.stringify(body, null, 2))

  const msg     = body?.message as Record<string, unknown> | undefined
  const payload = msg ?? body
  const type    = (payload?.type as string) ?? "unknown"

  if (type === "conversation-update" || type === "end-of-call-report") {
    const call = (payload?.call as VapiCall) ?? { id: (payload?.sessionId as string) ?? `chat_${Date.now()}` }
    if (!call.id) {
      return NextResponse.json({ error: "Missing call id" }, { status: 400 })
    }

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
      recordingUrl: payload?.recordingUrl as string | undefined,
      analysis:    payload?.analysis as VapiAnalysis | undefined,
    }

    try {
      const ip          = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? null
      const isPhoneCall = type === "end-of-call-report"
      const result = await processVapiEndOfCall(report, ip, isPhoneCall)
      if (result.alreadyExists) {
        return NextResponse.json({ received: true, processed: false, reason: "duplicate", chatLogId: result.chatLogId, callLogId: result.callLogId })
      }
      return NextResponse.json({ received: true, processed: true, chatLogId: result.chatLogId, callLogId: result.callLogId }, { status: 201 })
    } catch (err) {
      console.error("[POST /api/webhooks/vapi]", err)
      return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true, processed: false, type })
}

// ─── GET /api/webhooks/vapi (health check) ────────────────────────────────────

export async function GET() {
  return NextResponse.json({ status: "Vapi webhook receiver is active", timestamp: new Date().toISOString() })
}
