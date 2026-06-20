import { NextRequest } from "next/server"
import {
  chatbotJsonResponse,
  handleChatbotPreflight,
  rejectChatbotOrigin,
} from "@/lib/chatbot/cors"
import { chatbotMessageLimit, isRateLimited } from "@/lib/chatbot/rateLimit"

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

function detectBookingAction(reply: string): "show_calendar" | undefined {
  const t = reply.toLowerCase()
  if (/\b(book|schedule|pick a time|choose a (date|time)|calendar|available (slot|time))\b/.test(t)) {
    return "show_calendar"
  }
  return undefined
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

  let body: { sessionId?: string; message?: string; previousChatId?: string }
  try {
    body = await request.json()
  } catch {
    return chatbotJsonResponse({ error: "Invalid JSON" }, origin, { status: 400 })
  }

  const sessionId = String(body.sessionId ?? "").trim()
  const message   = String(body.message ?? "").trim()

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
    const vapiBody: Record<string, unknown> = {
      assistantId,
      input: message,
      assistantOverrides: {
        variableValues: {
          now: new Date().toISOString(),
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
    const action = detectBookingAction(reply)

    return chatbotJsonResponse(
      {
        reply,
        chatId: data.id ?? null,
        ...(action ? { action } : {}),
      },
      origin
    )
  } catch (err) {
    console.error("[POST /api/chatbot/message]", err)
    return chatbotJsonResponse({ error: "Failed to reach GIGI." }, origin, { status: 500 })
  }
}
