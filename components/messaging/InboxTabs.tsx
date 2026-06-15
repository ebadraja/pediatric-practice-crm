'use client'

import { cn } from '@/lib/utils'
import type { InboxFilter } from '@/types/messaging'

const TABS: { id: InboxFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unassigned', label: 'Unassigned' },
  { id: 'mine', label: 'My Inbox' },
]

interface InboxTabsProps {
  active: InboxFilter
  onChange: (inbox: InboxFilter) => void
}

export function InboxTabs({ active, onChange }: InboxTabsProps) {
  return (
    <div className="flex gap-1 p-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
            active === tab.id
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
