'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle, Loader2, Mic, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { AgentSummary } from '@/lib/retell/types'

export type AiAgentSettings = {
  active: boolean
  agentName: string
  voice: string
  greeting: string
  toneSlider: number
  speedSlider: number
  empathySlider: number
  emergencyPhone: string
}

type Status = { type: 'success' | 'error'; text: string } | null

const selectCls = 'w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500'
const textareaCls = 'w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500'
const labelCls = 'block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2'
const inputCls = 'dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'
const cardCls = 'dark:bg-slate-900 dark:border-slate-700'

function StatusText({ status }: { status: Status }) {
  if (!status) return null
  const Icon = status.type === 'success' ? CheckCircle : AlertCircle
  return (
    <p
      className={`flex items-start gap-2 text-sm ${
        status.type === 'success' ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'
      }`}
    >
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span>{status.text}</span>
    </p>
  )
}

async function readError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null)
  return body?.message || body?.error || fallback
}

/** Retell connection: API key (write-only) + agent ID. */
function RetellConnectionCard({ onSaved }: { onSaved: () => void }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<Status>(null)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [agentId, setAgentId] = useState('')
  const [chatAgentId, setChatAgentId] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/settings/retell')
      .then(async (res) => {
        if (!res.ok) throw new Error(await readError(res, 'Failed to load Retell settings'))
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        setHasApiKey(!!data.hasApiKey)
        setEnabled(!!data.enabled)
        setAgentId(data.agentId ?? '')
        setChatAgentId(data.chatAgentId ?? '')
      })
      .catch((e: Error) => !cancelled && setStatus({ type: 'error', text: e.message }))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const save = async (clearApiKey = false) => {
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch('/api/settings/retell', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clearApiKey ? { clearApiKey: true } : { apiKey, agentId, chatAgentId, enabled }),
      })
      if (!res.ok) throw new Error(await readError(res, 'Failed to save Retell settings'))
      const data = await res.json()
      setHasApiKey(!!data.hasApiKey)
      setEnabled(!!data.enabled)
      setApiKey('')
      setStatus({ type: 'success', text: clearApiKey ? 'API key removed.' : 'Retell connection saved.' })
      onSaved()
    } catch (e) {
      setStatus({ type: 'error', text: e instanceof Error ? e.message : 'Failed to save Retell settings' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className={cardCls}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="dark:text-slate-50">Retell Connection</CardTitle>
          {!loading && (
            <Badge
              className={
                hasApiKey
                  ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }
            >
              {hasApiKey ? 'Connected' : 'Not configured'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          <>
            <div>
              <label className={labelCls} htmlFor="retell-api-key">API Key</label>
              <Input
                id="retell-api-key"
                type="password"
                autoComplete="off"
                className={inputCls}
                value={apiKey}
                placeholder={hasApiKey ? 'Leave blank to keep current key' : 'key_…'}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="retell-agent-id">Voice Agent ID</label>
              <Input
                id="retell-agent-id"
                className={`${inputCls} font-mono`}
                value={agentId}
                placeholder="agent_…"
                onChange={(e) => setAgentId(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="retell-chat-agent-id">GIGI Chat Agent ID</label>
              <Input
                id="retell-chat-agent-id"
                className={`${inputCls} font-mono`}
                value={chatAgentId}
                placeholder="agent_…"
                onChange={(e) => setChatAgentId(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                The Retell chat agent behind the website chatbot. Point its custom functions at
                /api/webhooks/retell/chat-tools.
              </p>
            </div>
            <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                className="rounded accent-blue-600"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              Enable Retell voice agent integration
            </label>
            <div className="flex flex-wrap gap-2">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" disabled={saving} onClick={() => save()}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Connection
              </Button>
              {hasApiKey && (
                <Button variant="outline" disabled={saving} onClick={() => save(true)}>
                  Remove API Key
                </Button>
              )}
            </div>
            <StatusText status={status} />
          </>
        )}
      </CardContent>
    </Card>
  )
}

function StackRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b last:border-b-0 border-slate-100 dark:border-slate-800">
      <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-900 dark:text-slate-100 text-right break-all">{value}</span>
    </div>
  )
}

type AgentLoadResult =
  | { ok: true; summary: AgentSummary }
  | { ok: false; error: { code: string; text: string } }

async function fetchAgent(): Promise<AgentLoadResult> {
  try {
    const res = await fetch('/api/voice-agent')
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, error: { code: body?.error ?? 'error', text: body?.message || body?.error || 'Failed to load the voice agent' } }
    }
    return { ok: true, summary: body as AgentSummary }
  } catch {
    return { ok: false, error: { code: 'network', text: 'Could not reach the server.' } }
  }
}

/** Live agent: read-only stack + editable greeting / prompt / transfer number. */
function RetellLiveAgent({ reloadKey }: { reloadKey: number }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<{ code: string; text: string } | null>(null)
  const [status, setStatus] = useState<Status>(null)
  const [agent, setAgent] = useState<AgentSummary | null>(null)
  const [beginMessage, setBeginMessage] = useState('')
  const [generalPrompt, setGeneralPrompt] = useState('')
  const [transferNumber, setTransferNumber] = useState('')

  const applySummary = (summary: AgentSummary) => {
    setAgent(summary)
    setBeginMessage(summary.beginMessage)
    setGeneralPrompt(summary.generalPrompt)
    setTransferNumber(summary.transferNumber)
  }

  const applyResult = useCallback((result: AgentLoadResult) => {
    if (result.ok) {
      setLoadError(null)
      applySummary(result.summary)
    } else {
      setAgent(null)
      setLoadError(result.error)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchAgent().then((result) => !cancelled && applyResult(result))
    return () => {
      cancelled = true
    }
  }, [applyResult, reloadKey])

  const load = () => {
    setLoading(true)
    setStatus(null)
    fetchAgent().then(applyResult)
  }

  const dirty =
    agent !== null &&
    (beginMessage !== agent.beginMessage ||
      generalPrompt !== agent.generalPrompt ||
      (agent.transferEditable && transferNumber !== agent.transferNumber))

  const save = async () => {
    if (!agent) return
    const body: Record<string, string> = {}
    if (beginMessage !== agent.beginMessage) body.beginMessage = beginMessage
    if (generalPrompt !== agent.generalPrompt) body.generalPrompt = generalPrompt
    if (agent.transferEditable && transferNumber !== agent.transferNumber) body.transferNumber = transferNumber

    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch('/api/voice-agent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await readError(res, 'Failed to save the voice agent'))
      const result = await res.json()
      applySummary(result.summary)
      const version = result.savedVersion ?? '?'
      setStatus(
        result.published
          ? { type: 'success', text: `Saved and published as version ${version}. Live calls now use it.` }
          : {
              type: 'error',
              text: `Saved as version ${version} (draft), but it was not published${
                result.publishError ? `: ${result.publishError}` : '.'
              } Live calls still use the previous published version — save again to retry.`,
            }
      )
    } catch (e) {
      setStatus({ type: 'error', text: e instanceof Error ? e.message : 'Failed to save the voice agent' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className={cardCls}>
        <CardContent className="space-y-3 pt-6">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (loadError || !agent) {
    const needsSetup = loadError?.code === 'missing_key' || loadError?.code === 'missing_agent'
    return (
      <Card className={cardCls}>
        <CardHeader><CardTitle className="dark:text-slate-50">Live Agent</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <StatusText status={{ type: 'error', text: loadError?.text ?? 'Failed to load the voice agent' }} />
          {!needsSetup && (
            <Button variant="outline" onClick={load}>
              <RefreshCw className="w-4 h-4" />Retry
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={cardCls}>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="dark:text-slate-50">Live Agent · {agent.agentName}</CardTitle>
            <Button variant="outline" size="sm" disabled={saving} onClick={load}>
              <RefreshCw className="w-3.5 h-3.5" />Reload from Retell
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <StackRow label="Model" value={agent.modelLabel} />
          <StackRow label="Voice" value={agent.voiceLabel} />
          <StackRow label="Language" value={agent.languageLabel} />
          <StackRow label="Transcription" value={agent.sttLabel} />
          <StackRow
            label="Version"
            value={
              <span className="inline-flex items-center gap-2">
                {agent.version ?? '—'}
                <Badge
                  className={
                    agent.isPublished
                      ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                  }
                >
                  {agent.isPublished ? 'Published' : 'Draft'}
                </Badge>
              </span>
            }
          />
        </CardContent>
      </Card>

      <Card className={cardCls}>
        <CardHeader><CardTitle className="dark:text-slate-50">Agent Behavior</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {!agent.editable ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              This agent uses a <span className="font-mono">{agent.responseEngineType}</span> response engine. Its prompt
              and greeting are managed in the Retell dashboard and can&apos;t be edited here.
            </p>
          ) : (
            <>
              <div>
                <label className={labelCls} htmlFor="retell-transfer">Transfer Number</label>
                <Input
                  id="retell-transfer"
                  className={inputCls}
                  value={transferNumber}
                  disabled={!agent.transferEditable || saving}
                  placeholder="(512) 555-0123"
                  onChange={(e) => setTransferNumber(e.target.value)}
                />
                {!agent.hasTransferTool ? (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    This agent has no transfer_call tool in Retell, so there is no number to edit.
                  </p>
                ) : !agent.transferEditable ? (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    The transfer destination is chosen dynamically by a prompt. Edit it in the Retell dashboard.
                  </p>
                ) : null}
              </div>
              <div>
                <label className={labelCls} htmlFor="retell-greeting">Greeting (first message)</label>
                <Input
                  id="retell-greeting"
                  className={inputCls}
                  value={beginMessage}
                  disabled={saving}
                  placeholder="Leave empty to let the agent wait for the caller"
                  onChange={(e) => setBeginMessage(e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="retell-prompt">System Prompt</label>
                <Textarea
                  id="retell-prompt"
                  className={`${inputCls} min-h-96 font-mono text-xs md:text-xs`}
                  value={generalPrompt}
                  disabled={saving}
                  onChange={(e) => setGeneralPrompt(e.target.value)}
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Saving publishes a new agent version, so the next live call uses your changes.
              </p>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" disabled={!dirty || saving} onClick={save}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save &amp; Publish
              </Button>
            </>
          )}
          <StatusText status={status} />
        </CardContent>
      </Card>
    </>
  )
}

export function RetellAgentTab({
  aiAgent,
  onChange,
}: {
  aiAgent: AiAgentSettings
  onChange: (field: keyof AiAgentSettings, value: AiAgentSettings[keyof AiAgentSettings]) => void
}) {
  const [reloadKey, setReloadKey] = useState(0)

  return (
    <div className="space-y-6">
      <RetellConnectionCard onSaved={() => setReloadKey((k) => k + 1)} />
      <RetellLiveAgent reloadKey={reloadKey} />

      <Card className={cardCls}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="dark:text-slate-50">Voice Agent Status</CardTitle>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${aiAgent.active ? 'bg-green-500' : 'bg-slate-400'}`} />
              <span className={`text-sm font-medium ${aiAgent.active ? 'text-green-600 dark:text-green-400' : 'text-slate-600 dark:text-slate-400'}`}>
                {aiAgent.active ? 'Active' : 'Paused'}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className={labelCls}>Agent Name</label>
            <Input className={inputCls} value={aiAgent.agentName} onChange={(e) => onChange('agentName', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Voice</label>
            <select value={aiAgent.voice} onChange={(e) => onChange('voice', e.target.value)} className={selectCls}>
              <option value="rachel">Rachel - Warm Female</option>
              <option value="sarah">Sarah - Professional</option>
              <option value="bella">Bella - Friendly</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Greeting Message</label>
            <textarea value={aiAgent.greeting} onChange={(e) => onChange('greeting', e.target.value)} className={textareaCls} rows={4} />
          </div>
        </CardContent>
      </Card>

      <Card className={cardCls}>
        <CardHeader><CardTitle className="dark:text-slate-50">Personality Settings</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          {([
            { key: 'toneSlider', label: 'Tone', left: 'Formal', right: 'Casual', display: (v: number) => v < 40 ? 'Formal' : v > 60 ? 'Casual' : 'Balanced' },
            { key: 'speedSlider', label: 'Speed', left: 'Slow', right: 'Fast', display: (v: number) => v < 40 ? 'Slow' : v > 60 ? 'Fast' : 'Normal' },
            { key: 'empathySlider', label: 'Empathy', left: 'Direct', right: 'Empathetic', display: (v: number) => v < 40 ? 'Direct' : v > 60 ? 'Empathetic' : 'Balanced' },
          ] as const).map((slider) => (
            <div key={slider.key}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-900 dark:text-slate-100">{slider.label}</label>
                <span className="text-sm text-slate-600 dark:text-slate-400">{slider.display(aiAgent[slider.key])}</span>
              </div>
              <input type="range" min="0" max="100" value={aiAgent[slider.key]} onChange={(e) => onChange(slider.key, parseInt(e.target.value))} className="w-full accent-blue-600" />
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span>{slider.left}</span><span>{slider.right}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className={cardCls}>
        <CardHeader><CardTitle className="dark:text-slate-50">Call Routing & Escalation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className={labelCls}>Emergency Phone Number</label>
            <Input className={inputCls} value={aiAgent.emergencyPhone} onChange={(e) => onChange('emergencyPhone', e.target.value)} />
          </div>
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="font-medium text-sm text-slate-900 dark:text-slate-100 mb-3">Escalation Triggers</p>
            <div className="space-y-3">
              {['Customer mentions emergency keywords','Customer requests human/manager','Customer sounds upset (sentiment analysis)','3 failed clarification attempts','Insurance/billing disputes'].map((trigger, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="rounded accent-blue-600" />
                  <label className="text-sm text-slate-700 dark:text-slate-300">{trigger}</label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Button className="w-full bg-purple-600 hover:bg-purple-700 gap-2">
        <Mic className="w-4 h-4" />Test Call
      </Button>
    </div>
  )
}
