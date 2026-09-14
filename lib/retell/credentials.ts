import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'
import { RetellError } from './client'

export type RetellCreds =
  | { ok: true; apiKey: string; agentId: string }
  | { ok: false; response: NextResponse }

/** Resolve the Retell key + agent id from Settings, or an actionable 400 for the UI. */
export async function requireRetellCreds(): Promise<RetellCreds> {
  const settings = await prisma.settings.findFirst({
    select: { retellApiKey: true, retellAgentId: true },
  })
  const apiKey = settings?.retellApiKey ? decrypt(settings.retellApiKey) : ''
  if (!apiKey) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'missing_key', message: 'Add your Retell API key in the connection settings first.' },
        { status: 400 }
      ),
    }
  }
  const agentId = settings?.retellAgentId?.trim() ?? ''
  if (!agentId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'missing_agent', message: 'Add your Retell agent ID in the connection settings first.' },
        { status: 400 }
      ),
    }
  }
  return { ok: true, apiKey, agentId }
}

/** Decrypted Retell key + GIGI chat agent id, or nulls when not configured. */
export async function getRetellChatConfig(): Promise<{ apiKey: string; chatAgentId: string } | null> {
  const settings = await prisma.settings.findFirst({
    select: { retellApiKey: true, retellChatAgentId: true },
  })
  const apiKey = settings?.retellApiKey ? decrypt(settings.retellApiKey) : ''
  const chatAgentId = settings?.retellChatAgentId?.trim() ?? ''
  if (!apiKey || !chatAgentId) return null
  return { apiKey, chatAgentId }
}

/** Upstream Retell failures → 502 with Retell's message; our validation errors → 400. */
export function retellErrorResponse(error: RetellError): NextResponse {
  return NextResponse.json(
    { error: error.code, message: error.message },
    { status: error.upstream ? 502 : 400 }
  )
}
