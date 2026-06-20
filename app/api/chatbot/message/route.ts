import { NextRequest } from "next/server"
import {
  chatbotJsonResponse,
  handleChatbotPreflight,
  rejectChatbotOrigin,
} from "@/lib/chatbot/cors"
import { chatbotMessageLimit, isRateLimited } from "@/lib/chatbot/rateLimit"
import { getUpcomingSlotOptions, replyMentionsAvailability } from "@/lib/chatbot/slots"

export const dynamic = "force-dynamic"

const MESSAGE_WINDOW_MS = 60 * 60 * 1000 // 1 hour

interface VapiChatOutputMessage {
  role?: string
  content?: string
  message?: string
}

interface VapiChatResponse {
  id?: string
  output?: VapiChatOutputMessage[]
  error?: string
  message?: string
}

interface BookingContext {
  active?: boolean
  patientType?: "new" | "existing"
  contactName?: string
  contactPhone?: string
}

function resolveAssistantId(): string | null {
  return process.env.GIGI_ASSISTANT_ID ?? process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ?? null
}

function extractReply(data: VapiChatResponse): string {
  const parts = (data.output ?? [])
    .map((m) => (m.content ?? m.message ?? "").trim())
    .filter(Boolean)
  if (parts.length > 0) return parts.join("\n")
  if (typeof data.message === "string" && data.message.trim()) return data.message.trim()
  return "I'm sorry, I couldn't generate a reply. Please try again or call us at (253) 400-4479."
}

function buildVapiInput(message: string, ctx?: BookingContext): string {
  if (!ctx?.active) return message

  const parts: string[] = ["[Website chat booking]"]
  if (ctx.patientType === "new") parts.push("Patient type: NEW patient (not yet in our system).")
  if (ctx.patientType === "existing") parts.push("Patient type: EXISTING patient (look up their record).")
  if (ctx.contactName) parts.push(`Contact name: ${ctx.contactName}.`)
  if (ctx.contactPhone) parts.push(`Contact phone: ${ctx.contactPhone}.`)
  parts.push(message)
  return parts.join(" ")
}

export async function OPTIONS(request: NextRequest) {
  return handleChatbotPreflight(request) ?? chatbotJsonResponse({}, request.headers.get("origin"), { status: 204 })
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin")
  const preflight = handleChatbotPreflight(request)
  if (preflight) return preflight

  const originReject = rejectChatbotOrigin(origin)
  if (originReject) return originReject

  const privateKey = process.env.VAPI_PRIVATE_KEY
  const assistantId = resolveAssistantId()

  if (!privateKey || !assistantId) {
    return chatbotJsonResponse(
      { error: "Chatbot is not configured on the server." },
      origin,
      { status: 503 }
    )
  }

  let body: {
    sessionId?: string
    message?: string
    previousChatId?: string
    bookingContext?: BookingContext
  }
  try {
    body = await request.json()
  } catch {
    return chatbotJsonResponse({ error: "Invalid JSON" }, origin, { status: 400 })
  }

  const sessionId = String(body.sessionId ?? "").trim()
  const message   = String(body.message ?? "").trim()
  const bookingContext = body.bookingContext

  if (!sessionId) {
    return chatbotJsonResponse({ error: "sessionId is required" }, origin, { status: 400 })
  }
  if (!message || message.length > 4000) {
    return chatbotJsonResponse({ error: "message is required (max 4000 chars)" }, origin, { status: 400 })
  }

  const limit = chatbotMessageLimit()
  if (isRateLimited(`chatbot:session:${sessionId}`, limit, MESSAGE_WINDOW_MS)) {
    return chatbotJsonResponse(
      { error: "Too many messages. Please wait a while before trying again." },
      origin,
      { status: 429 }
    )
  }

  try {
    const vapiInput = buildVapiInput(message, bookingContext)
    const vapiBody: Record<string, unknown> = {
      assistantId,
      input: vapiInput,
      assistantOverrides: {
        variableValues: {
          now: new Date().toISOString(),
          channel: "website_chat",
          ...(bookingContext?.patientType && { patientType: bookingContext.patientType }),
          ...(bookingContext?.contactName && { contactName: bookingContext.contactName }),
          ...(bookingContext?.contactPhone && { contactPhone: bookingContext.contactPhone }),
        },
      },
    }
    if (body.previousChatId) {
      vapiBody.previousChatId = body.previousChatId
    }

    const vapiRes = await fetch("https://api.vapi.ai/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${privateKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(vapiBody),
    })

    const data = (await vapiRes.json()) as VapiChatResponse

    if (!vapiRes.ok) {
      console.error("[POST /api/chatbot/message] Vapi error:", vapiRes.status, data)
      return chatbotJsonResponse(
        { error: "GIGI is temporarily unavailable. Please try again shortly." },
        origin,
        { status: 502 }
      )
    }

    const reply = extractReply(data)

    const bookingActive = Boolean(bookingContext?.active)
    const showSlots =
      bookingActive &&
      (replyMentionsAvailability(reply) ||
        /\b(when|date|time|schedule|book|appointment)\b/i.test(message))

    let slots = undefined
    if (showSlots) {
      try {
        slots = await getUpcomingSlotOptions(7)
      } catch (err) {
        console.error("[POST /api/chatbot/message] slot fetch failed:", err)
      }
    }

    return chatbotJsonResponse(
      {
        reply,
        chatId: data.id ?? null,
        ...(bookingActive ? { bookingActive: true } : {}),
        ...(slots && slots.length > 0 ? { slots } : {}),
      },
      origin
    )
  } catch (err) {
    console.error("[POST /api/chatbot/message]", err)
    return chatbotJsonResponse({ error: "Failed to reach GIGI." }, origin, { status: 500 })
  }
}
