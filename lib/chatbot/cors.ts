import { NextRequest, NextResponse } from "next/server"

const DEFAULT_ORIGINS = [
  "https://www.kids0218.com",
  "https://kids0218.com",
  "https://kids-0-to-18-integrative-pediatrics.webflow.io",
  "http://localhost:3000",
]

export function getChatbotAllowedOrigins(): string[] {
  const raw = process.env.CHATBOT_CORS_ORIGINS
  if (!raw?.trim()) return DEFAULT_ORIGINS
  return raw.split(",").map((o) => o.trim()).filter(Boolean)
}

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false
  return getChatbotAllowedOrigins().includes(origin)
}

export function chatbotCorsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !isOriginAllowed(origin)) {
    return {}
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  }
}

export function withChatbotCors(response: NextResponse, origin: string | null): NextResponse {
  const headers = chatbotCorsHeaders(origin)
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value)
  }
  return response
}

export function chatbotJsonResponse(
  body: unknown,
  origin: string | null,
  init?: { status?: number }
): NextResponse {
  return withChatbotCors(NextResponse.json(body, { status: init?.status ?? 200 }), origin)
}

export function handleChatbotPreflight(request: NextRequest): NextResponse | null {
  if (request.method !== "OPTIONS") return null
  const origin = request.headers.get("origin")
  if (!isOriginAllowed(origin)) {
    return new NextResponse(null, { status: 403 })
  }
  return withChatbotCors(new NextResponse(null, { status: 204 }), origin)
}

export function rejectChatbotOrigin(origin: string | null): NextResponse | null {
  if (!origin) return null
  if (isOriginAllowed(origin)) return null
  return NextResponse.json({ error: "Origin not allowed" }, { status: 403 })
}
