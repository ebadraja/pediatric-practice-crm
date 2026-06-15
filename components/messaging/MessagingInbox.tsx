'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/toast-provider'
import { InboxTabs } from '@/components/messaging/InboxTabs'
import { ConversationList } from '@/components/messaging/ConversationList'
import { ConversationThread } from '@/components/messaging/ConversationThread'
import { PatientContextPanel } from '@/components/messaging/PatientContextPanel'
import { AssignmentDialog } from '@/components/messaging/AssignmentDialog'
import type {
  ConversationSummary,
  InboxFilter,
  PatientContextData,
  SerializedMessage,
} from '@/types/messaging'

interface MessagingInboxProps {
  initialConversationId?: string
}

export function MessagingInbox({ initialConversationId }: MessagingInboxProps) {
  const router = useRouter()
  const { showToast } = useToast()

  const [inbox, setInbox] = useState<InboxFilter>('all')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(initialConversationId ?? null)
  const [selectedConversation, setSelectedConversation] = useState<ConversationSummary | null>(null)
  const [messages, setMessages] = useState<SerializedMessage[]>([])
  const [patientContext, setPatientContext] = useState<PatientContextData | null>(null)

  const [listLoading, setListLoading] = useState(true)
  const [threadLoading, setThreadLoading] = useState(false)
  const [patientLoading, setPatientLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [showMobileThread, setShowMobileThread] = useState(!!initialConversationId)
  const [contextCollapsed, setContextCollapsed] = useState(false)

  const fetchConversations = useCallback(async () => {
    setListLoading(true)
    try {
      const params = new URLSearchParams({
        inbox,
        page: '1',
        limit: '50',
      })
      if (search.trim()) params.set('search', search.trim())

      const res = await fetch(`/api/messaging/conversations?${params}`)
      if (!res.ok) throw new Error('Failed to load conversations')
      const data = await res.json()
      setConversations(data.data ?? [])
    } catch {
      showToast('Failed to load conversations', 'error')
    } finally {
      setListLoading(false)
    }
  }, [inbox, search, showToast])

  const fetchMessages = useCallback(
    async (conversationId: string, markRead = true) => {
      setThreadLoading(true)
      try {
        const [msgRes, convRes] = await Promise.all([
          fetch(`/api/messaging/conversations/${conversationId}/messages?limit=100`),
          markRead
            ? fetch(`/api/messaging/conversations/${conversationId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markRead: true }),
              })
            : fetch(`/api/messaging/conversations/${conversationId}`),
        ])

        if (!msgRes.ok) throw new Error('Failed to load messages')
        const msgData = await msgRes.json()
        setMessages(msgData.data ?? [])

        if (convRes.ok) {
          const convData = await convRes.json()
          setSelectedConversation(convData)
          setConversations((prev) =>
            prev.map((c) => (c.id === conversationId ? { ...c, ...convData, unreadCount: 0 } : c)),
          )
          if (convData.patientId) void fetchPatientContext(convData.patientId)
        }
      } catch {
        showToast('Failed to load messages', 'error')
      } finally {
        setThreadLoading(false)
      }
    },
    [showToast, fetchPatientContext],
  )

  const fetchPatientContext = useCallback(async (patientId: string) => {
    setPatientLoading(true)
    try {
      const res = await fetch(`/api/patients/${patientId}`)
      if (!res.ok) throw new Error('Failed to load patient')
      const data = await res.json()
      setPatientContext(data)
    } catch {
      setPatientContext(null)
    } finally {
      setPatientLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    if (!selectedId) {
      setSelectedConversation(null)
      setMessages([])
      setPatientContext(null)
      return
    }

    void fetchMessages(selectedId)
  }, [selectedId, fetchMessages])

  useEffect(() => {
    if (initialConversationId) {
      setSelectedId(initialConversationId)
      setShowMobileThread(true)
    }
  }, [initialConversationId])

  const handleSelectConversation = (id: string) => {
    setSelectedId(id)
    setShowMobileThread(true)
    router.replace(`/messaging/${id}`, { scroll: false })
  }

  const handleBackToList = () => {
    setShowMobileThread(false)
    router.replace('/messaging', { scroll: false })
  }

  const handleSend = async (content: string) => {
    if (!selectedId) return
    setSending(true)
    try {
      const res = await fetch(`/api/messaging/conversations/${selectedId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, channel: 'PORTAL' }),
      })
      if (!res.ok) throw new Error('Failed to send')
      const msg = await res.json()
      setMessages((prev) => [...prev, msg])
      await fetchConversations()
      if (selectedConversation) {
        setSelectedConversation({
          ...selectedConversation,
          status: 'AWAITING_REPLY',
          lastMessagePreview: content.slice(0, 100),
          lastMessageAt: new Date().toISOString(),
        })
      }
    } catch {
      showToast('Failed to send message', 'error')
    } finally {
      setSending(false)
    }
  }

  const handleSendNote = async (content: string) => {
    if (!selectedId) return
    setSending(true)
    try {
      const res = await fetch(`/api/messaging/conversations/${selectedId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error('Failed to add note')
      const msg = await res.json()
      setMessages((prev) => [...prev, msg])
      showToast('Internal note added', 'success')
    } catch {
      showToast('Failed to add internal note', 'error')
    } finally {
      setSending(false)
    }
  }

  const handleStatusChange = async (status: 'OPEN' | 'RESOLVED' | 'ARCHIVED') => {
    if (!selectedId) return
    try {
      const res = await fetch(`/api/messaging/conversations/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      const updated = await res.json()
      setSelectedConversation(updated)
      setConversations((prev) => prev.map((c) => (c.id === selectedId ? updated : c)))
      showToast(`Conversation ${status.toLowerCase()}`, 'success')
    } catch {
      showToast('Failed to update conversation', 'error')
    }
  }

  const handleAssign = async (assignedToId: string | null, reason?: string) => {
    if (!selectedId || !assignedToId) return
    try {
      const res = await fetch(`/api/messaging/conversations/${selectedId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId, reason }),
      })
      if (!res.ok) throw new Error('Failed to assign')
      const updated = await res.json()
      setSelectedConversation(updated)
      setConversations((prev) => prev.map((c) => (c.id === selectedId ? updated : c)))
      showToast('Conversation assigned', 'success')
    } catch {
      showToast('Failed to assign conversation', 'error')
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] min-h-[600px] -mx-4 md:-mx-6 lg:-mx-8">
      <div className="px-4 md:px-6 lg:px-8 pb-3">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Messaging</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Unified inbox for patient conversations across portal, web chat, and SMS.
        </p>
      </div>

      <div className="flex flex-1 min-h-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mx-4 md:mx-6 lg:mx-8 rounded-t-xl overflow-hidden shadow-sm">
        {/* Left panel — conversation list */}
        <div
          className={`w-full lg:w-[280px] shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800 min-h-0 ${
            showMobileThread ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <InboxTabs active={inbox} onChange={setInbox} />
          <div className="p-2 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput)}
                placeholder="Search patients..."
                className="pl-8 h-9"
              />
            </div>
          </div>
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            loading={listLoading}
            onSelect={handleSelectConversation}
          />
        </div>

        {/* Center panel — thread */}
        <div
          className={`flex-1 flex flex-col min-w-0 min-h-0 ${
            showMobileThread ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {showMobileThread && (
            <div className="lg:hidden px-3 py-2 border-b border-slate-200 dark:border-slate-800">
              <Button type="button" variant="ghost" size="sm" onClick={handleBackToList}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Conversations
              </Button>
            </div>
          )}
          <ConversationThread
            conversation={selectedConversation}
            messages={messages}
            loading={threadLoading}
            sending={sending}
            onSend={handleSend}
            onSendNote={handleSendNote}
            onAssign={() => setAssignOpen(true)}
            onStatusChange={handleStatusChange}
          />
        </div>

        {/* Right panel — patient context */}
        <PatientContextPanel
          patient={patientContext}
          loading={patientLoading}
          collapsed={contextCollapsed}
          onToggle={() => setContextCollapsed((v) => !v)}
        />
      </div>

      <AssignmentDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        onAssign={handleAssign}
      />
    </div>
  )
}
