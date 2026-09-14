import { RetellError, retellErrorMessage, retellFetch } from './client'

type RetellChatMessage = {
  role?: string
  content?: string
  [key: string]: unknown
}

type RetellChat = {
  chat_id?: string
  chat_status?: string
  [key: string]: unknown
}

/** Start a Retell chat session for a chat agent. Returns the chat_id. */
export async function createChat(
  apiKey: string,
  agentId: string,
  dynamicVariables: Record<string, string> = {}
): Promise<string> {
  const res = await retellFetch<RetellChat>('/create-chat', apiKey, {
    method: 'POST',
    body: JSON.stringify({ agent_id: agentId, retell_llm_dynamic_variables: dynamicVariables }),
  })
  if (!res.ok || !res.json?.chat_id) {
    throw new RetellError('retell_error', retellErrorMessage(res, 'Could not start a Retell chat'), true)
  }
  return res.json.chat_id
}

/**
 * Send one user message and return the agent's reply text. Tool invocations
 * and results come back in the same array; only `agent` messages are shown.
 * `status` lets the caller tell a dead chat (4xx) from an outage (5xx).
 */
export async function sendChatMessage(
  apiKey: string,
  chatId: string,
  content: string
): Promise<{ ok: true; reply: string } | { ok: false; status: number; message: string }> {
  const res = await retellFetch<{ messages?: RetellChatMessage[] }>('/create-chat-completion', apiKey, {
    method: 'POST',
    body: JSON.stringify({ chat_id: chatId, content }),
  })
  if (!res.ok) {
    return { ok: false, status: res.status, message: retellErrorMessage(res, 'Retell chat completion failed') }
  }
  return { ok: true, reply: extractAgentReply(res.json?.messages) }
}

export function extractAgentReply(messages: RetellChatMessage[] | null | undefined): string {
  if (!Array.isArray(messages)) return ''
  return messages
    .filter((m) => m?.role === 'agent' && typeof m.content === 'string')
    .map((m) => (m.content as string).trim())
    .filter(Boolean)
    .join('\n')
}
