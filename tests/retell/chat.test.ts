import { describe, it, expect } from 'vitest'
import { createHmac } from 'crypto'
import { extractAgentReply } from '@/lib/retell/chat'
import { verifyRetellSignature } from '@/lib/retell/signature'

const KEY = 'key_test_1234567890'

function sign(body: string, ts: number, key = KEY) {
  return `v=${ts},d=${createHmac('sha256', key).update(body + ts).digest('hex')}`
}

describe('verifyRetellSignature', () => {
  const body = '{"name":"verify_insurance","args":{"plan_name":"Aetna"}}'
  const now = 1_790_000_000_000

  it('accepts a valid signature over the raw body', () => {
    expect(verifyRetellSignature(body, sign(body, now), KEY, now)).toBe(true)
  })

  it('rejects a tampered body, wrong key, or missing header', () => {
    expect(verifyRetellSignature(body.replace('Aetna', 'Kaiser'), sign(body, now), KEY, now)).toBe(false)
    expect(verifyRetellSignature(body, sign(body, now, 'key_other_123456'), KEY, now)).toBe(false)
    expect(verifyRetellSignature(body, null, KEY, now)).toBe(false)
    expect(verifyRetellSignature(body, 'garbage', KEY, now)).toBe(false)
    expect(verifyRetellSignature(body, 'v=abc,d=zz', KEY, now)).toBe(false)
  })

  it('rejects timestamps older than 5 minutes (replay)', () => {
    const old = now - 6 * 60 * 1000
    expect(verifyRetellSignature(body, sign(body, old), KEY, now)).toBe(false)
  })
})

describe('extractAgentReply', () => {
  it('returns only agent text, skipping tool call messages', () => {
    const reply = extractAgentReply([
      { role: 'user', content: 'Do you take Aetna?' },
      { role: 'tool_call_invocation', name: 'verify_insurance', arguments: '{}' },
      { role: 'tool_call_result', content: 'Yes, Aetna is accepted.' },
      { role: 'agent', content: ' Yes, we accept Aetna. ' },
      { role: 'agent', content: 'Anything else?' },
    ])
    expect(reply).toBe('Yes, we accept Aetna.\nAnything else?')
  })

  it('handles empty or malformed input', () => {
    expect(extractAgentReply(undefined)).toBe('')
    expect(extractAgentReply([{ role: 'agent' }])).toBe('')
  })
})
