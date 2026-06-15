'use client'

import { useState } from 'react'
import { Send, StickyNote, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import { TemplatePicker } from '@/components/messaging/TemplatePicker'

interface MessageComposerProps {
  disabled?: boolean
  sending?: boolean
  patientId?: string | null
  onSend: (content: string) => Promise<void>
  onSendNote: (content: string) => Promise<void>
}

export function MessageComposer({ disabled, sending, patientId, onSend, onSendNote }: MessageComposerProps) {
  const [content, setContent] = useState('')
  const [mode, setMode] = useState<'reply' | 'note'>('reply')

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
        <TemplatePicker
          patientId={patientId ?? null}
          disabled={disabled || sending}
          onInsert={(text) => setContent((prev) => (prev ? `${prev}\n\n${text}` : text))}
        />
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
