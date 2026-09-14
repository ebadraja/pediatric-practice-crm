import { RetellError, retellErrorMessage, retellFetch } from './client'
import type { RetellCall, RetellListCallsResponse, UsageCall } from './types'

const PAGE_LIMIT = 1000
const MAX_PAGES = 50

function num(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

/**
 * Retell reports every cost in **cents**. This is the only place in the app
 * that converts to dollars — everything above lib/retell works in dollars.
 */
export function centsToDollars(cents: unknown): number {
  return num(cents) / 100
}

/** Normalize a raw Retell call. Returns null for calls that never connected. */
export function normalizeCall(call: RetellCall): UsageCall | null {
  if (call.call_status !== 'ended') return null
  const duration = num(call.duration_ms)
  return {
    callId: call.call_id ?? '',
    startMs: num(call.start_timestamp),
    durationMs: duration > 0 ? duration : 0,
    costDollars: centsToDollars(call.call_cost?.combined_cost),
    productCosts: (call.call_cost?.product_costs ?? []).map((p) => ({
      product: typeof p?.product === 'string' && p.product ? p.product : 'other',
      costDollars: centsToDollars(p?.cost),
    })),
  }
}

/**
 * Ended calls for ONE agent between fromMs and toMs. Always filtered by
 * agent_id: an org can hold several agents, and an unfiltered query would bill
 * this practice for another agent's traffic.
 */
export async function listAgentCalls(
  apiKey: string,
  agentId: string,
  fromMs: number,
  toMs: number
): Promise<UsageCall[]> {
  const calls: UsageCall[] = []
  let paginationKey: string | undefined

  for (let page = 0; page < MAX_PAGES; page++) {
    const body: Record<string, unknown> = {
      filter_criteria: {
        agent: [{ agent_id: agentId }],
        start_timestamp: { type: 'range', op: 'bt', value: [fromMs, toMs] },
      },
      sort_order: 'descending',
      limit: PAGE_LIMIT,
    }
    // Retell rejects skip + pagination_key together; use the cursor only.
    if (paginationKey) body.pagination_key = paginationKey

    const res = await retellFetch<RetellListCallsResponse>('/v3/list-calls', apiKey, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    if (!res.ok || !res.json) {
      throw new RetellError('retell_error', retellErrorMessage(res, 'Could not load calls from Retell'), true)
    }

    const items = Array.isArray(res.json.items) ? res.json.items : []
    for (const raw of items) {
      const call = normalizeCall(raw)
      if (call) calls.push(call)
    }

    if (!res.json.has_more || !res.json.pagination_key || items.length === 0) break
    paginationKey = res.json.pagination_key
  }

  return calls
}

export function totalMinutes(calls: UsageCall[]): number {
  return calls.reduce((sum, c) => sum + (c.durationMs > 0 ? c.durationMs : 0), 0) / 60000
}

/** Sum provider cost per product. Products are whatever Retell returns — never hardcoded. */
export function groupProductCosts(calls: UsageCall[]): { product: string; costDollars: number }[] {
  const byProduct = new Map<string, number>()
  for (const call of calls) {
    for (const p of call.productCosts) {
      byProduct.set(p.product, (byProduct.get(p.product) ?? 0) + p.costDollars)
    }
  }
  return [...byProduct.entries()]
    .map(([product, costDollars]) => ({ product, costDollars }))
    .sort((a, b) => b.costDollars - a.costDollars)
}
