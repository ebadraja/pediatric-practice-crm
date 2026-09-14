'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

type Range = 'month' | '7d' | '30d'

type UsageResponse = {
  range: Range
  timezone: string
  periodLabel: string
  billing: {
    ratePerMin: number
    stack: { key: string; label: string; ratePerMin: number; description: string; model: string }[]
  }
  totals: { calls: number; minutes: number; billed: number; avgMinutes: number }
  provider: { totalCost: number; breakdown: { product: string; cost: number }[] }
  daily: { date: string; calls: number; minutes: number; billed: number; providerCost: number }[]
}

const RANGES: { id: Range; label: string }[] = [
  { id: 'month', label: 'This month' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
]

const cardCls = 'dark:bg-slate-900 dark:border-slate-700'

const usd = (n: number, digits = 2) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits })

const fmtMinutes = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 })

/** `2026-09-13` → `Sep 13` without re-interpreting the date in the browser's timezone. */
function shortDay(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function productLabel(product: string) {
  return product.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  )
}

async function fetchUsage(range: Range): Promise<{ ok: true; data: UsageResponse } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/voice-agent/usage?range=${range}`)
    const body = await res.json().catch(() => null)
    if (!res.ok) return { ok: false, error: body?.message || body?.error || 'Failed to load usage' }
    return { ok: true, data: body as UsageResponse }
  } catch {
    return { ok: false, error: 'Could not reach the server.' }
  }
}

export function RetellUsageTab() {
  const [range, setRange] = useState<Range>('month')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<UsageResponse | null>(null)

  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchUsage(range).then((result) => {
      if (cancelled) return
      setData(result.ok ? result.data : null)
      setError(result.ok ? null : result.error)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [range, reloadKey])

  const selectRange = (r: Range) => {
    if (r === range) return
    setLoading(true)
    setRange(r)
  }

  const retry = () => {
    setLoading(true)
    setReloadKey((k) => k + 1)
  }

  return (
    <Card className={cardCls}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="dark:text-slate-50">Voice Agent Usage</CardTitle>
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <Button
                key={r.id}
                size="sm"
                variant={range === r.id ? 'default' : 'outline'}
                className={range === r.id ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
                disabled={loading}
                onClick={() => selectRange(r.id)}
              >
                {r.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-1/2" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error || !data ? (
          <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-4 space-y-3">
            <p className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error ?? 'Failed to load usage'}</span>
            </p>
            <Button variant="outline" size="sm" onClick={retry}>
              <RefreshCw className="w-3.5 h-3.5" />Retry
            </Button>
          </div>
        ) : (
          <>
            {/* Headline: what the practice is billed */}
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Billed · {data.periodLabel}</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">{usd(data.totals.billed)}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {fmtMinutes(data.totals.minutes)} min × {usd(data.billing.ratePerMin)}/min
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatTile label="Calls" value={data.totals.calls.toLocaleString('en-US')} />
              <StatTile label="Minutes" value={fmtMinutes(data.totals.minutes)} />
              <StatTile label="Avg length" value={`${fmtMinutes(data.totals.avgMinutes)} min`} />
              <StatTile label="Retell cost" value={usd(data.provider.totalCost)} hint="Actual provider spend" />
            </div>

            {data.totals.calls === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400 text-center py-8">
                No completed calls for this agent in this period.
              </p>
            ) : (
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">Daily minutes</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.daily.map((d) => ({ ...d, label: shortDay(d.date) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      interval={data.daily.length > 14 ? Math.floor(data.daily.length / 10) : 0}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip
                      formatter={(value, name) =>
                        name === 'Minutes' ? [fmtMinutes(Number(value)), name] : [value, name]
                      }
                    />
                    <Bar dataKey="minutes" name="Minutes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Provider's real spend, from product_costs */}
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Retell cost breakdown</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">What Retell charged — not what the practice is billed.</p>
                {data.provider.breakdown.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No cost data.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.provider.breakdown.map((p) => (
                      <li key={p.product} className="flex justify-between py-2 text-sm">
                        <span className="text-slate-700 dark:text-slate-300">{productLabel(p.product)}</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">{usd(p.cost, 4)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Client-facing rate card */}
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Rate card</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  {usd(data.billing.ratePerMin)} per minute, billed to the practice.
                </p>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.billing.stack.map((line) => (
                    <li key={line.key} className="flex justify-between gap-4 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="text-slate-700 dark:text-slate-300">{line.label}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{line.model}</p>
                      </div>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{usd(line.ratePerMin)}/min</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Times are in {data.timezone}. Only completed calls are counted. Retell keeps call history indefinitely unless a
              data-retention period is set on the agent, in which case older calls may be missing.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
