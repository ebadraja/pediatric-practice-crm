/**
 * Hand-written types for the subset of the Retell AI API this app uses.
 * Every object carries an index signature so unknown fields survive a
 * read → modify → write round trip.
 */

export type RetellResponseEngineType = 'retell-llm' | 'custom-llm' | 'conversation-flow'

export type RetellResponseEngine = {
  type?: RetellResponseEngineType | string
  llm_id?: string
  version?: number | null
  [key: string]: unknown
}

export type RetellAgent = {
  agent_id?: string
  agent_name?: string | null
  response_engine?: RetellResponseEngine
  voice_id?: string
  voice_model?: string | null
  language?: string | string[]
  stt_mode?: string | null
  version?: number
  is_published?: boolean
  [key: string]: unknown
}

export type RetellTransferDestination = {
  type?: 'predefined' | 'inferred' | string
  number?: string
  prompt?: string
  [key: string]: unknown
}

export type RetellTool = {
  type?: string
  name?: string
  description?: string
  transfer_destination?: RetellTransferDestination
  transfer_option?: Record<string, unknown>
  speak_during_execution?: boolean
  [key: string]: unknown
}

export type RetellLlm = {
  llm_id?: string
  version?: number
  is_published?: boolean
  model?: string | null
  general_prompt?: string | null
  begin_message?: string | null
  general_tools?: RetellTool[] | null
  [key: string]: unknown
}

export type RetellProductCost = {
  product?: string
  unit_price?: number
  cost?: number
  [key: string]: unknown
}

export type RetellCall = {
  call_id?: string
  agent_id?: string
  call_status?: 'registered' | 'not_connected' | 'ongoing' | 'ended' | 'error' | string
  start_timestamp?: number
  end_timestamp?: number
  duration_ms?: number
  call_cost?: {
    product_costs?: RetellProductCost[]
    combined_cost?: number
    total_duration_seconds?: number
    [key: string]: unknown
  } | null
  [key: string]: unknown
}

export type RetellListCallsResponse = {
  items?: RetellCall[]
  has_more?: boolean
  pagination_key?: string
  [key: string]: unknown
}

/** Flat shape the Agent Settings UI renders. */
export type AgentSummary = {
  agentId: string
  agentName: string
  voiceLabel: string
  modelLabel: string
  languageLabel: string
  sttLabel: string
  version: number | null
  isPublished: boolean
  responseEngineType: string
  editable: boolean
  beginMessage: string
  generalPrompt: string
  transferNumber: string
  hasTransferTool: boolean
  transferEditable: boolean
}

/** A call normalized for billing. All money is in US dollars. */
export type UsageCall = {
  callId: string
  startMs: number
  durationMs: number
  costDollars: number
  productCosts: { product: string; costDollars: number }[]
}
