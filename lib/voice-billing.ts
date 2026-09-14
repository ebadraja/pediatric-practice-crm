/** Client-facing voice rate card (line items sum to CLIENT_RATE_PER_MIN). */
export const CLIENT_RATE_PER_MIN = 0.22

/** The practice is in Washington state. Override with PRACTICE_TIMEZONE if that changes. */
export const PRACTICE_TIMEZONE = process.env.PRACTICE_TIMEZONE || 'America/Los_Angeles'

export type RateLineKey = 'transcription' | 'llm' | 'voice' | 'platform'

export type RateLine = {
  key: RateLineKey
  label: string
  ratePerMin: number
  description: string
}

export const RATE_STACK: RateLine[] = [
  { key: 'transcription', label: 'Transcription', ratePerMin: 0.02, description: 'Speech-to-text' },
  { key: 'llm', label: 'LLM', ratePerMin: 0.04, description: 'Conversation model' },
  { key: 'voice', label: 'Voice', ratePerMin: 0.08, description: 'Text-to-speech' },
  { key: 'platform', label: 'Platform & telephony', ratePerMin: 0.08, description: 'Voice agent hosting and call routing' },
]

export function billFromMinutes(minutes: number): number {
  const safe = Number.isFinite(minutes) && minutes > 0 ? minutes : 0
  return Math.round(safe * CLIENT_RATE_PER_MIN * 100) / 100
}

const ymdFormatters = new Map<string, Intl.DateTimeFormat>()

/** `YYYY-MM-DD` for an instant, in the given IANA timezone. */
export function dayKeyInTimeZone(ms: number, timeZone: string): string {
  let fmt = ymdFormatters.get(timeZone)
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    ymdFormatters.set(timeZone, fmt)
  }
  return fmt.format(new Date(ms))
}

/** Calendar month start (local midnight) in an IANA timezone, as a UTC instant. */
export function startOfMonthInTimeZone(timeZone: string, now = new Date()): Date {
  const [y, m] = dayKeyInTimeZone(now.getTime(), timeZone).split('-').map(Number)
  const wallClock = Date.UTC(y, m - 1, 1)

  // Two passes: the offset at the naive guess may differ from the offset at
  // the true instant when a DST change falls between them.
  let instant = wallClock - timeZoneOffsetMs(wallClock, timeZone)
  instant = wallClock - timeZoneOffsetMs(instant, timeZone)
  return new Date(instant)
}

/** Local wall-clock minus UTC, in ms, at the given instant (e.g. -5h for CDT). */
function timeZoneOffsetMs(ms: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(new Date(ms))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  const localAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return localAsUtc - (ms - (((ms % 1000) + 1000) % 1000))
}

export function formatMonthLabel(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, month: 'long', year: 'numeric' }).format(now)
}

/** Every local day key from start to end inclusive (12h steps survive DST days). */
export function dayKeysBetween(startMs: number, endMs: number, timeZone: string): string[] {
  const keys = new Set<string>()
  for (let t = startMs; t <= endMs; t += 12 * 3600 * 1000) {
    keys.add(dayKeyInTimeZone(t, timeZone))
  }
  keys.add(dayKeyInTimeZone(endMs, timeZone))
  return [...keys].sort()
}
