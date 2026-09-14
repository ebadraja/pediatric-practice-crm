export const RETELL_BASE_URL = 'https://api.retellai.com'

export type RetellResult<T = unknown> = {
  ok: boolean
  status: number
  json: T | null
  text: string
}

/**
 * Low-level Retell request. Never throws on an HTTP error: a non-2xx body is
 * often text/plain or HTML, so the body is read as text and parsed defensively.
 * Network failures still reject and are handled by the caller's try/catch.
 */
export async function retellFetch<T = unknown>(
  path: string,
  apiKey: string,
  init?: RequestInit
): Promise<RetellResult<T>> {
  const res = await fetch(`${RETELL_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })
  const text = await res.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  return { ok: res.ok, status: res.status, json: json as T | null, text }
}

/** Best human-readable message from a failed Retell response. */
export function retellErrorMessage(result: RetellResult, fallback: string): string {
  const body = result.json as { message?: unknown; error_message?: unknown } | null
  if (body && typeof body.message === 'string' && body.message) return body.message
  if (body && typeof body.error_message === 'string' && body.error_message) return body.error_message
  const text = result.text.trim()
  if (text && text.length <= 300 && !text.startsWith('<')) return text
  return `${fallback} (HTTP ${result.status})`
}

/** Error raised by the lib/retell layer; routes map `upstream` to 502, else 400. */
export class RetellError extends Error {
  constructor(
    public code: string,
    message: string,
    public upstream = false
  ) {
    super(message)
    this.name = 'RetellError'
  }
}
