import { describe, it, expect, vi, afterEach } from 'vitest'
import { findTransferTool, rewriteTransferNumber, summarizeAgent, toE164 } from '@/lib/retell/agent'
import { RetellError, retellErrorMessage } from '@/lib/retell/client'
import { centsToDollars, groupProductCosts, listAgentCalls, normalizeCall, totalMinutes } from '@/lib/retell/usage'
import type { RetellCall, RetellTool } from '@/lib/retell/types'

describe('cents → dollars', () => {
  it('converts Retell cents to dollars exactly once', () => {
    expect(centsToDollars(1234)).toBe(12.34)
    expect(centsToDollars(0)).toBe(0)
    expect(centsToDollars(undefined)).toBe(0)
    expect(centsToDollars('nope')).toBe(0)
  })

  it('normalizes call cost and product costs to dollars', () => {
    const call = normalizeCall({
      call_id: 'c1',
      call_status: 'ended',
      start_timestamp: 1_700_000_000_000,
      duration_ms: 90_000,
      call_cost: {
        combined_cost: 250,
        product_costs: [
          { product: 'elevenlabs_tts', unit_price: 0.07, cost: 120 },
          { product: 'gpt_4o', unit_price: 0.05, cost: 130 },
        ],
      },
    })
    expect(call?.costDollars).toBe(2.5)
    expect(call?.productCosts).toEqual([
      { product: 'elevenlabs_tts', costDollars: 1.2 },
      { product: 'gpt_4o', costDollars: 1.3 },
    ])
  })

  it('handles a combined_cost of 0 and a missing call_cost', () => {
    expect(normalizeCall({ call_status: 'ended', call_cost: { combined_cost: 0 } })?.costDollars).toBe(0)
    const missing = normalizeCall({ call_status: 'ended' })
    expect(missing?.costDollars).toBe(0)
    expect(missing?.productCosts).toEqual([])
  })

  it('drops calls that never connected', () => {
    for (const status of ['registered', 'not_connected', 'ongoing', 'error', undefined]) {
      expect(normalizeCall({ call_status: status, duration_ms: 60_000 })).toBeNull()
    }
  })
})

describe('minute summation', () => {
  it('ignores calls with missing, zero, or negative duration', () => {
    const calls = [
      { call_status: 'ended', duration_ms: 120_000 },
      { call_status: 'ended', duration_ms: 0 },
      { call_status: 'ended' },
      { call_status: 'ended', duration_ms: -5_000 },
      { call_status: 'ended', duration_ms: 60_000 },
    ].map((c) => normalizeCall(c as RetellCall)!)
    expect(totalMinutes(calls)).toBe(3)
    expect(Number.isNaN(totalMinutes(calls))).toBe(false)
  })

  it('groups product costs by whatever products Retell returns', () => {
    const calls = [
      { call_status: 'ended', call_cost: { product_costs: [{ product: 'a', cost: 100 }, { product: 'b', cost: 50 }] } },
      { call_status: 'ended', call_cost: { product_costs: [{ product: 'a', cost: 100 }, { product: 'c', cost: 10 }] } },
    ].map((c) => normalizeCall(c as RetellCall)!)
    expect(groupProductCosts(calls)).toEqual([
      { product: 'a', costDollars: 2 },
      { product: 'b', costDollars: 0.5 },
      { product: 'c', costDollars: 0.1 },
    ])
  })
})

describe('toE164', () => {
  it.each([
    ['(262) 923-3303', '+12629233303'],
    ['262-923-3303', '+12629233303'],
    ['2629233303', '+12629233303'],
    ['12629233303', '+12629233303'],
    ['+12629233303', '+12629233303'],
    ['+44 20 7946 0958', '+442079460958'],
  ])('accepts %s', (input, expected) => {
    expect(toE164(input)).toBe(expected)
  })

  it.each(['', '   ', 'abc', '923-3303', '22629233303', '+1234567', '+1234567890123456'])('rejects %j', (input) => {
    expect(toE164(input)).toBeNull()
  })
})

describe('transfer number rewrite', () => {
  const tools: RetellTool[] = [
    { type: 'end_call', name: 'end_call', description: 'Hang up' },
    {
      type: 'transfer_call',
      name: 'transfer_to_front_desk',
      description: 'Transfer to staff',
      transfer_destination: { type: 'predefined', number: '+15125550000', extension: '12' },
      transfer_option: { type: 'warm_transfer', show_transferee_as_caller: true },
      speak_during_execution: true,
      execution_message_description: 'One moment',
    },
    { type: 'custom', name: 'lookup', url: 'https://example.com', parameters: { type: 'object', properties: { number: { type: 'string' } } } },
  ]

  it('replaces only the destination number and preserves everything else', () => {
    const out = rewriteTransferNumber(tools, '+15125559999')
    expect(out).toHaveLength(3)
    expect(out[0]).toEqual(tools[0])
    expect(out[2]).toEqual(tools[2])
    expect(out[1]).toEqual({
      ...tools[1],
      transfer_destination: { type: 'predefined', number: '+15125559999', extension: '12' },
    })
    // Input is not mutated.
    expect(tools[1].transfer_destination?.number).toBe('+15125550000')
  })

  it('throws when there is no transfer tool', () => {
    expect(() => rewriteTransferNumber([tools[0]], '+15125559999')).toThrow(RetellError)
  })

  it('refuses to overwrite an inferred destination', () => {
    const inferred: RetellTool[] = [
      { type: 'transfer_call', name: 't', transfer_destination: { type: 'inferred', prompt: 'Pick a number' } },
    ]
    expect(() => rewriteTransferNumber(inferred, '+15125559999')).toThrow(/dynamically/)
  })

  it('never reads a parameter schema as the transfer number', () => {
    const summary = summarizeAgent(
      { agent_id: 'a', response_engine: { type: 'retell-llm', llm_id: 'l' } },
      { general_tools: [tools[2], { type: 'transfer_call', transfer_destination: { type: 'inferred', prompt: 'x' } }] }
    )
    expect(summary.transferNumber).toBe('')
    expect(summary.hasTransferTool).toBe(true)
    expect(summary.transferEditable).toBe(false)
    expect(findTransferTool(null)).toBeNull()
  })
})

describe('summarizeAgent', () => {
  it('marks non retell-llm engines read-only', () => {
    const summary = summarizeAgent(
      { agent_id: 'a', response_engine: { type: 'conversation-flow' }, version: 3, is_published: true },
      null
    )
    expect(summary.editable).toBe(false)
    expect(summary.responseEngineType).toBe('conversation-flow')
    expect(summary.version).toBe(3)
    expect(summary.isPublished).toBe(true)
  })
})

describe('retellErrorMessage', () => {
  it('uses JSON message, then short text, and never dumps HTML', () => {
    expect(retellErrorMessage({ ok: false, status: 400, json: { message: 'bad agent' }, text: '' }, 'x')).toBe('bad agent')
    expect(retellErrorMessage({ ok: false, status: 502, json: null, text: 'Bad Gateway' }, 'x')).toBe('Bad Gateway')
    expect(retellErrorMessage({ ok: false, status: 500, json: null, text: '<html>oops</html>' }, 'Failed')).toBe('Failed (HTTP 500)')
  })
})

describe('listAgentCalls', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('filters by agent and time range, and paginates with pagination_key only', async () => {
    const bodies: Record<string, unknown>[] = []
    const pages = [
      { items: [{ call_status: 'ended', duration_ms: 60_000, call_cost: { combined_cost: 100 } }], has_more: true, pagination_key: 'k1' },
      { items: [{ call_status: 'not_connected' }, { call_status: 'ended', duration_ms: 30_000 }], has_more: false },
    ]
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        bodies.push(JSON.parse(init.body as string))
        return new Response(JSON.stringify(pages[bodies.length - 1]), { status: 200 })
      })
    )

    const calls = await listAgentCalls('key_1234567890', 'agent_abc', 1000, 2000)
    expect(calls).toHaveLength(2)
    expect(calls[0].costDollars).toBe(1)
    expect(bodies[0]).toMatchObject({
      filter_criteria: {
        agent: [{ agent_id: 'agent_abc' }],
        start_timestamp: { type: 'range', op: 'bt', value: [1000, 2000] },
      },
      limit: 1000,
    })
    expect(bodies[0]).not.toHaveProperty('pagination_key')
    expect(bodies[1].pagination_key).toBe('k1')
    expect(bodies.every((b) => !('skip' in b))).toBe(true)
  })

  it('turns a non-JSON upstream error into an upstream RetellError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>502</html>', { status: 502 })))
    await expect(listAgentCalls('key_1234567890', 'agent_abc', 0, 1)).rejects.toMatchObject({ upstream: true })
  })
})
