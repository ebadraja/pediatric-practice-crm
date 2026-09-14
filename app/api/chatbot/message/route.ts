import { NextRequest } from "next/server"
import {
  chatbotJsonResponse,
  handleChatbotPreflight,
  rejectChatbotOrigin,
} from "@/lib/chatbot/cors"
import { chatbotMessageLimit, isRateLimited } from "@/lib/chatbot/rateLimit"
import { persistWebsiteChatTurn } from "@/lib/chatbot/persistChatLog"
import { createChat, sendChatMessage } from "@/lib/retell/chat"
import { getRetellChatConfig } from "@/lib/retell/credentials"
import { RetellError } from "@/lib/retell/client"

export const dynamic = "force-dynamic"

const MESSAGE_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const FALLBACK_REPLY =
  "I'm sorry, I couldn't generate a reply. Please try again or call us at (253) 400-4479."

export async function OPTIONS(request: NextRequest) {
  return handleChatbotPreflight(request) ?? chatbotJsonResponse({}, request.headers.get("origin"), { status: 204 })
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin")
  const preflight = handleChatbotPreflight(request)
  if (preflight) return preflight

  const originReject = rejectChatbotOrigin(origin)
  if (originReject) return originReject

  const config = await getRetellChatConfig()
  if (!config) {
    return chatbotJsonResponse(
      { error: "Chatbot is not configured on the server." },
      origin,
      { status: 503 }
    )
  }

  let body: {
    sessionId?: string
    message?: string
    chatId?: string
    previousChatId?: string
    sourcePage?: string
  }
  try {
    body = await request.json()
  } catch {
    return chatbotJsonResponse({ error: "Invalid JSON" }, origin, { status: 400 })
  }

  const sessionId = String(body.sessionId ?? "").trim()
  const message   = String(body.message ?? "").trim()
  // `previousChatId` is what widgets cached before the Retell switch still send.
  const incomingChatId = String(body.chatId ?? body.previousChatId ?? "").trim()

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

  const startChat = () =>
    createChat(config.apiKey, config.chatAgentId, {
      now: new Date().toISOString(),
      channel: "website_chat",
    })

  try {
    let chatId = incomingChatId || (await startChat())
    let result = await sendChatMessage(config.apiKey, chatId, message)

    // An ended, expired, or pre-Retell chat id is rejected with a 4xx — start a fresh chat once.
    if (!result.ok && incomingChatId && result.status >= 400 && result.status < 500) {
      chatId = await startChat()
      result = await sendChatMessage(config.apiKey, chatId, message)
    }

    if (!result.ok) {
      console.error("[POST /api/chatbot/message] Retell error:", result.status, result.message)
      return chatbotJsonResponse(
        { error: "GIGI is temporarily unavailable. Please try again shortly." },
        origin,
        { status: 502 }
      )
    }

    const reply = result.reply || FALLBACK_REPLY

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null

    void persistWebsiteChatTurn({
      sessionId,
      userMessage: message,
      botReply: reply,
      sourcePage: body.sourcePage ?? request.headers.get("referer"),
      requestIp: ip,
    }).catch((err) => console.error("[POST /api/chatbot/message] chat log persist failed:", err))

    return chatbotJsonResponse({ reply, chatId }, origin)
  } catch (err) {
    if (err instanceof RetellError) {
      console.error("[POST /api/chatbot/message] Retell error:", err.message)
      return chatbotJsonResponse(
        { error: "GIGI is temporarily unavailable. Please try again shortly." },
        origin,
        { status: 502 }
      )
    }
    console.error("[POST /api/chatbot/message]", err)
    return chatbotJsonResponse({ error: "Failed to reach GIGI." }, origin, { status: 500 })
  }
}
