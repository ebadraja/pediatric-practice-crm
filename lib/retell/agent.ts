import { RetellError, retellErrorMessage, retellFetch } from './client'
import type { AgentSummary, RetellAgent, RetellLlm, RetellTool } from './types'

/**
 * Normalize user input into E.164. Accepts `(262) 923-3303` or `+12629233303`.
 * Bare 10-digit numbers are treated as US (+1); 11 digits starting with 1 get a `+`.
 */
export function toE164(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return null
  if (hasPlus) {
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null
  }
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return null
}

function isTransferTool(tool: RetellTool | null | undefined): tool is RetellTool {
  return tool?.type === 'transfer_call'
}

/**
 * The transfer tool whose number we manage. Prefers a `predefined` destination,
 * which is the only kind that holds a configured number; an `inferred`
 * destination is a prompt, not user data, and is never read as a number.
 */
export function findTransferTool(tools: RetellTool[] | null | undefined): RetellTool | null {
  if (!Array.isArray(tools)) return null
  return (
    tools.find((t) => isTransferTool(t) && t.transfer_destination?.type === 'predefined') ??
    tools.find(isTransferTool) ??
    null
  )
}

export function transferNumberOf(tool: RetellTool | null): string {
  const dest = tool?.transfer_destination
  if (dest?.type !== 'predefined') return ''
  return typeof dest.number === 'string' ? dest.number : ''
}

/**
 * Replace only the managed transfer tool's destination number. Every other
 * tool, and every other field on the transfer tool (transfer_option,
 * speak_during_execution, …), is preserved as-is.
 */
export function rewriteTransferNumber(tools: RetellTool[], number: string): RetellTool[] {
  const target = findTransferTool(tools)
  if (!target) {
    throw new RetellError(
      'missing_transfer_tool',
      'This agent has no transfer_call tool in Retell, so there is no number to update.'
    )
  }
  if (target.transfer_destination?.type !== 'predefined') {
    throw new RetellError(
      'transfer_not_predefined',
      'This agent picks its transfer destination dynamically from a prompt. Edit it in the Retell dashboard.'
    )
  }
  return tools.map((tool) =>
    tool === target
      ? { ...tool, transfer_destination: { ...tool.transfer_destination, number } }
      : tool
  )
}

function joinLabel(...parts: (string | null | undefined)[]): string {
  return parts.filter((p) => typeof p === 'string' && p.trim()).join(' · ') || '—'
}

export function summarizeAgent(agent: RetellAgent, llm: RetellLlm | null): AgentSummary {
  const engineType = agent.response_engine?.type ?? 'unknown'
  const editable = engineType === 'retell-llm' && llm !== null
  const tool = findTransferTool(llm?.general_tools)
  const language = Array.isArray(agent.language) ? agent.language.join(', ') : agent.language

  return {
    agentId: agent.agent_id ?? '',
    agentName: agent.agent_name || 'Voice agent',
    voiceLabel: joinLabel(agent.voice_id, agent.voice_model),
    modelLabel: editable ? joinLabel(llm?.model) : joinLabel(engineType),
    languageLabel: joinLabel(language),
    sttLabel: joinLabel(agent.stt_mode),
    version: typeof agent.version === 'number' ? agent.version : null,
    isPublished: agent.is_published === true,
    responseEngineType: engineType,
    editable,
    beginMessage: typeof llm?.begin_message === 'string' ? llm.begin_message : '',
    generalPrompt: typeof llm?.general_prompt === 'string' ? llm.general_prompt : '',
    transferNumber: transferNumberOf(tool),
    hasTransferTool: tool !== null,
    transferEditable: tool?.transfer_destination?.type === 'predefined',
  }
}

async function getAgent(apiKey: string, agentId: string, version?: number | null): Promise<RetellAgent> {
  const query = typeof version === 'number' ? `?version=${version}` : ''
  const res = await retellFetch<RetellAgent>(`/get-agent/${encodeURIComponent(agentId)}${query}`, apiKey)
  if (!res.ok || !res.json) {
    throw new RetellError('retell_error', retellErrorMessage(res, 'Could not load the agent from Retell'), true)
  }
  return res.json
}

async function getLlm(apiKey: string, llmId: string, version?: number | null): Promise<RetellLlm> {
  const query = typeof version === 'number' ? `?version=${version}` : ''
  const res = await retellFetch<RetellLlm>(`/get-retell-llm/${encodeURIComponent(llmId)}${query}`, apiKey)
  if (!res.ok || !res.json) {
    throw new RetellError('retell_error', retellErrorMessage(res, 'Could not load the agent prompt from Retell'), true)
  }
  return res.json
}

/**
 * Two-hop read: agent → response_engine.llm_id → Retell LLM.
 * Non retell-llm engines return `llm: null` so the UI can render read-only.
 */
export async function getAgentWithLlm(
  apiKey: string,
  agentId: string,
  version?: number | null
): Promise<{ agent: RetellAgent; llm: RetellLlm | null }> {
  const agent = await getAgent(apiKey, agentId, version)
  const engine = agent.response_engine
  if (engine?.type !== 'retell-llm' || !engine.llm_id) {
    return { agent, llm: null }
  }
  const llm = await getLlm(apiKey, engine.llm_id, engine.version)
  return { agent, llm }
}

export type AgentConfigUpdate = {
  beginMessage?: string
  generalPrompt?: string
  transferNumber?: string
}

export type UpdateResult = {
  summary: AgentSummary
  savedVersion: number | null
  published: boolean
  publishError: string | null
}

/**
 * Write greeting / prompt / transfer number to the agent's Retell LLM, make
 * sure the agent's draft points at the new LLM version, then publish that
 * draft so live calls use it. If publishing fails the change is still saved
 * as a draft and `publishError` says why.
 */
export async function updateAgentConfig(
  apiKey: string,
  agentId: string,
  update: AgentConfigUpdate
): Promise<UpdateResult> {
  const { agent, llm } = await getAgentWithLlm(apiKey, agentId)
  if (!llm || !agent.response_engine?.llm_id) {
    throw new RetellError(
      'unsupported_response_engine',
      `This agent uses a "${agent.response_engine?.type ?? 'unknown'}" response engine. Only Retell LLM agents can be edited here.`
    )
  }
  const llmId = agent.response_engine.llm_id

  const patch: Partial<RetellLlm> = {}
  if (update.beginMessage !== undefined) patch.begin_message = update.beginMessage
  if (update.generalPrompt !== undefined) patch.general_prompt = update.generalPrompt
  if (update.transferNumber !== undefined) {
    patch.general_tools = rewriteTransferNumber(llm.general_tools ?? [], update.transferNumber)
  }

  const llmRes = await retellFetch<RetellLlm>(`/update-retell-llm/${encodeURIComponent(llmId)}`, apiKey, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  if (!llmRes.ok || !llmRes.json) {
    throw new RetellError('retell_error', retellErrorMessage(llmRes, 'Could not save changes to Retell'), true)
  }
  const savedLlm = llmRes.json

  // The agent pins an LLM version; point its latest draft at the one we just wrote.
  let draft = await getAgent(apiKey, agentId)
  const pinned = draft.response_engine?.version
  if (typeof savedLlm.version === 'number' && typeof pinned === 'number' && pinned !== savedLlm.version) {
    const agentRes = await retellFetch<RetellAgent>(`/update-agent/${encodeURIComponent(agentId)}`, apiKey, {
      method: 'PATCH',
      body: JSON.stringify({ response_engine: { ...draft.response_engine, version: savedLlm.version } }),
    })
    if (!agentRes.ok || !agentRes.json) {
      throw new RetellError(
        'retell_error',
        retellErrorMessage(agentRes, 'Saved the prompt, but could not attach it to the agent'),
        true
      )
    }
    draft = agentRes.json
  }

  const savedVersion = typeof draft.version === 'number' ? draft.version : null
  let published = draft.is_published === true
  let publishError: string | null = null

  if (!published && savedVersion !== null) {
    const pubRes = await retellFetch(`/publish-agent-version/${encodeURIComponent(agentId)}`, apiKey, {
      method: 'POST',
      body: JSON.stringify({ version: savedVersion }),
    })
    if (pubRes.ok) {
      published = true
    } else {
      publishError = retellErrorMessage(pubRes, 'Retell did not publish the new version')
    }
  }

  // Reload the version we wrote (publishing may open a newer empty draft) so
  // the UI reflects what Retell now holds, not what we sent.
  const fresh = await getAgentWithLlm(apiKey, agentId, savedVersion)
  return { summary: summarizeAgent(fresh.agent, fresh.llm), savedVersion, published, publishError }
}
