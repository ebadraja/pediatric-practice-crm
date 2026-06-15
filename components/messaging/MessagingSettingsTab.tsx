'use client'

import { useEffect, useState } from 'react'
import { Inbox, Loader2, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useSession } from 'next-auth/react'
import { REASON_OPTIONS } from '@/lib/messaging/settingsSchemas'
import type { MessageTemplateSummary, SharedInboxSummary } from '@/types/messaging'

const labelCls = 'block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2'
const inputCls =
  'dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'

const DEFAULT_HOURS = {
  monday: { open: '08:00', close: '17:00' },
  tuesday: { open: '08:00', close: '17:00' },
  wednesday: { open: '08:00', close: '17:00' },
  thursday: { open: '08:00', close: '17:00' },
  friday: { open: '08:00', close: '17:00' },
  saturday: { closed: true },
  sunday: { closed: true },
}

const DEFAULT_ROUTING: Record<string, string> = {
  SCHEDULING: 'Scheduling',
  REFILL: 'Refills',
  QUESTION: 'Clinical',
  URGENT: 'Clinical',
  INSURANCE: 'Billing',
  RECORDS: 'Billing',
  OTHER: 'Scheduling',
}

export function MessagingSettingsTab() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [messagingEnabled, setMessagingEnabled] = useState(false)
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [offlineMessage, setOfflineMessage] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#2563eb')
  const [portalBaseUrl, setPortalBaseUrl] = useState('')
  const [routingRules, setRoutingRules] = useState<Record<string, string>>(DEFAULT_ROUTING)

  const [templates, setTemplates] = useState<MessageTemplateSummary[]>([])
  const [inboxes, setInboxes] = useState<SharedInboxSummary[]>([])
  const [newTemplate, setNewTemplate] = useState({ name: '', category: 'General', body: '' })
  const [newInboxName, setNewInboxName] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [settingsRes, templatesRes, inboxesRes] = await Promise.all([
        fetch('/api/settings/messaging'),
        fetch('/api/messaging/templates'),
        fetch('/api/messaging/shared-inboxes'),
      ])

      if (settingsRes.ok) {
        const s = await settingsRes.json()
        setMessagingEnabled(s.messagingEnabled ?? false)
        const widget = (s.webChatWidgetConfig ?? {}) as Record<string, string>
        setWelcomeMessage(widget.welcomeMessage ?? '')
        setOfflineMessage(widget.offlineMessage ?? '')
        setPrimaryColor(widget.primaryColor ?? '#2563eb')
        const portal = (s.portalConfig ?? {}) as { baseUrl?: string }
        setPortalBaseUrl(portal.baseUrl ?? '')
        setRoutingRules({ ...DEFAULT_ROUTING, ...(s.defaultRoutingRules ?? {}) })
      }

      if (templatesRes.ok) {
        const t = await templatesRes.json()
        setTemplates(t.data ?? [])
      }
      if (inboxesRes.ok) {
        const i = await inboxesRes.json()
        setInboxes(i.data ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const saveSettings = async () => {
    if (!isAdmin) return
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/settings/messaging', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messagingEnabled,
          messagingBusinessHours: DEFAULT_HOURS,
          defaultRoutingRules: routingRules,
          webChatWidgetConfig: {
            enabled: true,
            welcomeMessage,
            offlineMessage,
            primaryColor,
            position: 'bottom-right',
          },
          portalConfig: portalBaseUrl ? { baseUrl: portalBaseUrl } : null,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      setMessage({ type: 'success', text: 'Messaging settings saved.' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to save messaging settings.' })
    } finally {
      setSaving(false)
    }
  }

  const createTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.body.trim()) return
    const res = await fetch('/api/messaging/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTemplate),
    })
    if (res.ok) {
      setNewTemplate({ name: '', category: 'General', body: '' })
      await load()
    }
  }

  const deleteTemplate = async (id: string) => {
    await fetch(`/api/messaging/templates/${id}`, { method: 'DELETE' })
    await load()
  }

  const createInbox = async () => {
    if (!isAdmin || !newInboxName.trim()) return
    const res = await fetch('/api/messaging/shared-inboxes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newInboxName.trim() }),
    })
    if (res.ok) {
      setNewInboxName('')
      await load()
    }
  }

  const toggleSubscribe = async (inbox: SharedInboxSummary) => {
    const method = inbox.isSubscribed ? 'DELETE' : 'POST'
    await fetch(`/api/messaging/shared-inboxes/${inbox.id}/subscribe`, { method })
    await load()
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500 py-12 justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading messaging settings...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200'
              : 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <Card className="dark:bg-slate-900 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="dark:text-slate-50">Messaging Module</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={messagingEnabled}
              onChange={(e) => setMessagingEnabled(e.target.checked)}
              disabled={!isAdmin}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Enable patient messaging (portal, web chat widget, CRM inbox)
            </span>
          </label>

          <div>
            <label className={labelCls}>Portal base URL</label>
            <Input
              className={inputCls}
              value={portalBaseUrl}
              onChange={(e) => setPortalBaseUrl(e.target.value)}
              placeholder="https://your-domain.com/portal"
              disabled={!isAdmin}
            />
          </div>

          <div>
            <label className={labelCls}>Web chat welcome message</label>
            <Textarea
              className={inputCls}
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              disabled={!isAdmin}
              rows={2}
            />
          </div>

          <div>
            <label className={labelCls}>Offline message</label>
            <Textarea
              className={inputCls}
              value={offlineMessage}
              onChange={(e) => setOfflineMessage(e.target.value)}
              disabled={!isAdmin}
              rows={2}
            />
          </div>

          <div>
            <label className={labelCls}>Widget color</label>
            <Input
              className={inputCls}
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              disabled={!isAdmin}
            />
          </div>

          <div className="space-y-2">
            <label className={labelCls}>Default routing (reason → inbox)</label>
            {REASON_OPTIONS.map((reason) => (
              <div key={reason} className="flex items-center gap-2">
                <span className="text-xs w-24 text-slate-500">{reason}</span>
                <Input
                  className={`${inputCls} h-8 text-sm`}
                  value={routingRules[reason] ?? ''}
                  onChange={(e) =>
                    setRoutingRules((prev) => ({ ...prev, [reason]: e.target.value }))
                  }
                  disabled={!isAdmin}
                />
              </div>
            ))}
          </div>

          {isAdmin && (
            <Button onClick={() => void saveSettings()} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? 'Saving...' : 'Save Messaging Settings'}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="dark:bg-slate-900 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="dark:text-slate-50">Message Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm text-slate-900 dark:text-slate-50">
                  {t.category} — {t.name}
                </p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.body}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-red-500"
                onClick={() => void deleteTemplate(t.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <div className="grid gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <Input
              className={inputCls}
              placeholder="Template name"
              value={newTemplate.name}
              onChange={(e) => setNewTemplate((p) => ({ ...p, name: e.target.value }))}
            />
            <Input
              className={inputCls}
              placeholder="Category (e.g. Scheduling)"
              value={newTemplate.category}
              onChange={(e) => setNewTemplate((p) => ({ ...p, category: e.target.value }))}
            />
            <Textarea
              className={inputCls}
              placeholder="Body with merge tags: {{patient.firstName}}, {{practice.name}}, {{portal.link}}"
              value={newTemplate.body}
              onChange={(e) => setNewTemplate((p) => ({ ...p, body: e.target.value }))}
              rows={3}
            />
            <Button type="button" variant="outline" onClick={() => void createTemplate()}>
              <Plus className="h-4 w-4 mr-1" />
              Add Template
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="dark:bg-slate-900 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="dark:text-slate-50">Shared Inboxes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {inboxes.map((inbox) => (
            <div
              key={inbox.id}
              className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Inbox className="h-4 w-4 text-slate-400 shrink-0" />
                <div>
                  <p className="font-medium text-sm text-slate-900 dark:text-slate-50">{inbox.name}</p>
                  {inbox.description && (
                    <p className="text-xs text-slate-500">{inbox.description}</p>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant={inbox.isSubscribed ? 'default' : 'outline'}
                size="sm"
                className="text-xs shrink-0"
                onClick={() => void toggleSubscribe(inbox)}
              >
                {inbox.isSubscribed ? 'Subscribed' : 'Subscribe'}
              </Button>
            </div>
          ))}

          {isAdmin && (
            <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <Input
                className={inputCls}
                placeholder="New inbox name"
                value={newInboxName}
                onChange={(e) => setNewInboxName(e.target.value)}
              />
              <Button type="button" variant="outline" onClick={() => void createInbox()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
