'use client'

import { useState } from 'react'
import { FileText, Send, StickyNote, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import { TemplatePicker } from '@/components/messaging/TemplatePicker'

interface MessageComposerProps {
  disabled?: boolean
  sending?: boolean
  patientId?: string | null
  conversationId?: string | null
  onSend: (content: string) => Promise<void>
  onSendNote: (content: string) => Promise<void>
  onFormLinkSent?: () => void
}

export function MessageComposer({
  disabled,
  sending,
  patientId,
  conversationId,
  onSend,
  onSendNote,
  onFormLinkSent,
}: MessageComposerProps) {
  const [content, setContent] = useState('')
  const [mode, setMode] = useState<'reply' | 'note'>('reply')
  const [showFormLink, setShowFormLink] = useState(false)
  const [formLinkUrl, setFormLinkUrl] = useState('')
  const [formLinkTitle, setFormLinkTitle] = useState('Patient intake form')
  const [sendingFormLink, setSendingFormLink] = useState(false)

  const handleSubmit = async () => {
    const trimmed = content.trim()
    if (!trimmed || sending || disabled) return

    if (mode === 'note') {
      await onSendNote(trimmed)
    } else {
      await onSend(trimmed)
    }
    setContent('')
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit()
    }
  }

  const handleSendFormLink = async () => {
    const url = formLinkUrl.trim()
    if (!url || !conversationId || sendingFormLink || disabled) return

    setSendingFormLink(true)
    try {
      const res = await fetch(`/api/messaging/conversations/${conversationId}/form-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, title: formLinkTitle.trim() || 'Patient intake form' }),
      })
      if (!res.ok) throw new Error('Failed')
      setFormLinkUrl('')
      setShowFormLink(false)
      onFormLinkSent?.()
    } catch {
      // Parent may show toast via refresh failure
    } finally {
      setSendingFormLink(false)
    }
  }

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
      <div className="flex gap-1 mb-2">
        <button
          type="button"
          onClick={() => setMode('reply')}
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium',
            mode === 'reply'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
          )}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Reply
        </button>
        <button
          type="button"
          onClick={() => setMode('note')}
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium',
            mode === 'note'
              ? 'bg-amber-500 text-white'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
          )}
        >
          <StickyNote className="h-3.5 w-3.5" />
          Internal Note
        </button>
      </div>

      {mode === 'reply' && (
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <TemplatePicker
            patientId={patientId ?? null}
            disabled={disabled || sending}
            onInsert={(text) => setContent((prev) => (prev ? `${prev}\n\n${text}` : text))}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={disabled || sending || !conversationId}
            onClick={() => setShowFormLink((v) => !v)}
          >
            <FileText className="h-3.5 w-3.5 mr-1" />
            Form link
          </Button>
        </div>
      )}

      {showFormLink && mode === 'reply' && (
        <div className="mb-2 rounded-md border border-slate-200 dark:border-slate-700 p-2 space-y-2">
          <Input
            value={formLinkTitle}
            onChange={(e) => setFormLinkTitle(e.target.value)}
            placeholder="Form title"
            disabled={disabled || sendingFormLink}
            className="h-8 text-xs"
          />
          <Input
            value={formLinkUrl}
            onChange={(e) => setFormLinkUrl(e.target.value)}
            placeholder="https://hippatizer.com/..."
            disabled={disabled || sendingFormLink}
            className="h-8 text-xs"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs"
              disabled={disabled || sendingFormLink || !formLinkUrl.trim()}
              onClick={() => void handleSendFormLink()}
            >
              Send link
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setShowFormLink(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-2 items-end">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled || sending}
          placeholder={
            mode === 'note'
              ? 'Add an internal note (visible to staff only)...'
              : 'Type a reply to the patient...'
          }
          className={cn(
            'min-h-[72px] resize-none flex-1',
            mode === 'note' && 'border-amber-300 dark:border-amber-700',
          )}
        />
        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={disabled || sending || !content.trim()}
          className={cn('shrink-0', mode === 'note' && 'bg-amber-500 hover:bg-amber-600')}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
