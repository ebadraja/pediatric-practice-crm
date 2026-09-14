import { createHmac, timingSafeEqual } from 'crypto'

const MAX_SKEW_MS = 5 * 60 * 1000

/**
 * Verify an `X-Retell-Signature` header (`v=<timestampMs>,d=<hex>`), where
 * d = HMAC-SHA256(rawBody + timestamp) keyed with the Retell API key.
 * Must be given the raw request body, never re-serialized JSON.
 */
export function verifyRetellSignature(
  rawBody: string,
  header: string | null,
  apiKey: string,
  now = Date.now()
): boolean {
  if (!header || !apiKey) return false

  const parts = Object.fromEntries(
    header.split(',').map((part) => {
      const i = part.indexOf('=')
      return i === -1 ? [part.trim(), ''] : [part.slice(0, i).trim(), part.slice(i + 1).trim()]
    })
  )
  const timestamp = parts.v
  const digest = parts.d
  if (!timestamp || !digest || !/^\d+$/.test(timestamp) || !/^[0-9a-f]+$/i.test(digest)) return false
  if (Math.abs(now - Number(timestamp)) > MAX_SKEW_MS) return false

  const expected = createHmac('sha256', apiKey).update(rawBody + timestamp).digest()
  const received = Buffer.from(digest, 'hex')
  return received.length === expected.length && timingSafeEqual(received, expected)
}
