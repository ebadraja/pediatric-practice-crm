import { describe, it, expect } from 'vitest'
import {
  CLIENT_RATE_PER_MIN,
  RATE_STACK,
  billFromMinutes,
  dayKeyInTimeZone,
  dayKeysBetween,
  startOfMonthInTimeZone,
} from '@/lib/voice-billing'

const TZ = 'America/Los_Angeles'

describe('rate card', () => {
  it('line items sum to the client rate', () => {
    const sum = RATE_STACK.reduce((s, l) => s + l.ratePerMin, 0)
    expect(Math.round(sum * 100) / 100).toBe(CLIENT_RATE_PER_MIN)
    expect(CLIENT_RATE_PER_MIN).toBe(0.22)
  })

  it('bills minutes at the rate and guards bad input', () => {
    expect(billFromMinutes(100)).toBe(22)
    expect(billFromMinutes(0)).toBe(0)
    expect(billFromMinutes(-3)).toBe(0)
    expect(billFromMinutes(Number.NaN)).toBe(0)
  })
})

describe('startOfMonthInTimeZone', () => {
  it('returns local midnight in PDT (UTC-7)', () => {
    const start = startOfMonthInTimeZone(TZ, new Date('2026-09-13T15:00:00Z'))
    expect(start.toISOString()).toBe('2026-09-01T07:00:00.000Z')
  })

  it('returns local midnight in PST (UTC-8)', () => {
    const start = startOfMonthInTimeZone(TZ, new Date('2026-12-20T15:00:00Z'))
    expect(start.toISOString()).toBe('2026-12-01T08:00:00.000Z')
  })

  it('handles a month that contains the spring-forward DST change', () => {
    // DST starts 2026-03-08 in the US; March 1 is still PST.
    const start = startOfMonthInTimeZone(TZ, new Date('2026-03-20T12:00:00Z'))
    expect(start.toISOString()).toBe('2026-03-01T08:00:00.000Z')
  })

  it('handles a month that contains the fall-back DST change', () => {
    // DST ends 2026-11-01; November 1 00:00 is still PDT.
    const start = startOfMonthInTimeZone(TZ, new Date('2026-11-15T12:00:00Z'))
    expect(start.toISOString()).toBe('2026-11-01T07:00:00.000Z')
  })

  it('uses the practice month, not the UTC month, at the boundary', () => {
    // 2026-10-01T03:00Z is still Sept 30 in Seattle.
    const start = startOfMonthInTimeZone(TZ, new Date('2026-10-01T03:00:00Z'))
    expect(start.toISOString()).toBe('2026-09-01T07:00:00.000Z')
  })
})

describe('day bucketing', () => {
  it('keys a late-evening call to the local day', () => {
    expect(dayKeyInTimeZone(Date.parse('2026-09-14T05:30:00Z'), TZ)).toBe('2026-09-13')
  })

  it('lists every local day across a DST change without gaps or duplicates', () => {
    const keys = dayKeysBetween(Date.parse('2026-10-30T07:00:00Z'), Date.parse('2026-11-03T12:00:00Z'), TZ)
    expect(keys).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03'])
  })
})
