'use client'

import { format } from 'date-fns'
import { Globe, MessageCircle, Monitor, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MessageChannel, SerializedMessage } from '@/types/messaging'

const CHANNEL_META: Record<
  MessageChannel,
  { label: string; icon: typeof Globe; className: string }
> = {
  SMS: { label: 'SMS', icon: Smartphone, className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  WEB_CHAT: { label: 'Web Chat', icon: Globe, className: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300' },
  PORTAL: { label: 'Portal', icon: Monitor, className: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  SYSTEM: { label: 'System', icon: MessageCircle, className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
}

interface MessageBubbleProps {
  message: SerializedMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isStaff = message.senderType === 'STAFF'
  const isSystem = message.senderType === 'SYSTEM'
  const channel = CHANNEL_META[message.channel]

  if (isSystem && !message.isInternalNote) {
    const meta = message.metadata as { url?: string; title?: string } | null
    const formUrl = meta?.url ?? (message.contentType === 'FORM_LINK' ? parseFormLinkUrl(message.content) : null)
    const formTitle = meta?.title ?? (message.contentType === 'FORM_LINK' ? parseFormLinkTitle(message.content) : null)

    return (
      <div className="flex justify-center my-2">
        <div className="max-w-[85%] rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-400 text-center">
          <ChannelBadge channel={message.channel} />
          {message.contentType === 'FORM_LINK' && formUrl ? (
            <div className="mt-1">
              <p className="font-medium text-slate-700 dark:text-slate-300">{formTitle ?? 'Intake form'}</p>
              <a
                href={formUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline break-all"
              >
                {formUrl}
              </a>
            </div>
          ) : (
            <p className="mt-1">{message.content}</p>
          )}
          <p className="mt-1 text-[10px] opacity-70">{format(new Date(message.createdAt), 'MMM d, h:mm a')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex mb-3', isStaff ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[78%] rounded-2xl px-3.5 py-2.5 shadow-sm',
          isStaff
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-md',
        )}
      >
        {!isStaff && message.senderName && (
          <p className="text-[10px] font-medium mb-1 opacity-80">{message.senderName}</p>
        )}
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        <div className={cn('flex items-center gap-2 mt-1.5 flex-wrap', isStaff ? 'justify-end' : 'justify-start')}>
          <ChannelBadge channel={message.channel} compact={isStaff} />
          <span className={cn('text-[10px]', isStaff ? 'text-blue-100' : 'text-slate-400')}>
            {format(new Date(message.createdAt), 'h:mm a')}
          </span>
        </div>
      </div>
    </div>
  )
}

function parseFormLinkUrl(content: string): string | null {
  const lines = content.trim().split('\n')
  const last = lines[lines.length - 1]?.trim()
  return last?.startsWith('http') ? last : null
}

function parseFormLinkTitle(content: string): string | null {
  const lines = content.trim().split('\n')
  if (lines.length < 2) return null
  return lines.slice(0, -1).join('\n').trim() || null
}

function ChannelBadge({ channel, compact }: { channel: MessageChannel; compact?: boolean }) {
  const meta = CHANNEL_META[channel]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
        compact ? 'bg-blue-500/30 text-blue-50' : meta.className,
      )}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  )
}
