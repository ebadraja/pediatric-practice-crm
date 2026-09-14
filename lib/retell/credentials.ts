import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'
import { RetellError } from './client'

/**
 * True when Prisma failed because the retell_* columns don't exist yet —
 * i.e. the add_retell_voice_agent migration hasn't been deployed.
 */
export function isMissingRetellColumns(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null
  return e?.code === 'P2022' || /retell_[a-z_]+.*does not exist|column .*retell/i.test(e?.message ?? '')
}

export const MISSING_MIGRATION_MESSAGE =
  'The database is missing the Retell columns. On the server run `npx prisma migrate deploy`, then restart the app.'

export type RetellCreds =
  | { ok: true; apiKey: string; agentId: string }
  | { ok: false; response: NextResponse }

/** Resolve the Retell key + agent id from Settings, or an actionable 400 for the UI. */
export async function requireRetellCreds(): Promise<RetellCreds> {
  let settings: { retellApiKey: string | null; retellAgentId: string | null } | null
  try {
    settings = await prisma.settings.findFirst({
      select: { retellApiKey: true, retellAgentId: true },
    })
  } catch (error) {
    console.error('[RETELL_CREDENTIALS]', error)
    return {
      ok: false,
      response: NextResponse.json(
        isMissingRetellColumns(error)
          ? { error: 'missing_migration', message: MISSING_MIGRATION_MESSAGE }
          : { error: 'settings_unavailable', message: 'Could not read Retell settings from the database.' },
        { status: 500 }
      ),
    }
  }
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
