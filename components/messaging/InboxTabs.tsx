'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InboxFilter, SharedInboxSummary } from '@/types/messaging'

const BASE_TABS: { id: InboxFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unassigned', label: 'Unassigned' },
  { id: 'mine', label: 'My Inbox' },
]

/** Keep default inboxes in a predictable tab order. */
const DEFAULT_INBOX_ORDER = ['Scheduling', 'Refills', 'Clinical', 'Billing']

function sortSharedInboxes(inboxes: SharedInboxSummary[]): SharedInboxSummary[] {
  return [...inboxes].sort((a, b) => {
    const aIndex = DEFAULT_INBOX_ORDER.indexOf(a.name)
    const bIndex = DEFAULT_INBOX_ORDER.indexOf(b.name)
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
    if (aIndex !== -1) return -1
    if (bIndex !== -1) return 1
    return a.name.localeCompare(b.name)
  })
}

interface InboxTabsProps {
  active: InboxFilter
  sharedInboxId: string | null
  sharedInboxes: SharedInboxSummary[]
  onChange: (inbox: InboxFilter, sharedInboxId?: string | null) => void
}

export function InboxTabs({
  active,
  sharedInboxId,
  sharedInboxes,
  onChange,
}: InboxTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Always show every shared inbox — subscription is for Settings only, not tab visibility.
  const sharedTabs = sortSharedInboxes(sharedInboxes)

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
  }, [])

  useEffect(() => {
    updateScrollState()
    const el = scrollRef.current
    if (!el) return

    el.addEventListener('scroll', updateScrollState, { passive: true })
    const observer = new ResizeObserver(updateScrollState)
    observer.observe(el)

    return () => {
      el.removeEventListener('scroll', updateScrollState)
      observer.disconnect()
    }
  }, [updateScrollState, sharedTabs.length])

  const scrollBy = (delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' })
  }

  return (
    <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 min-w-0 shrink-0">
      <div className="relative flex items-stretch min-w-0">
        {canScrollLeft && (
          <button
            type="button"
            aria-label="Scroll tabs left"
            onClick={() => scrollBy(-140)}
            className="absolute left-0 z-10 h-full px-1 bg-gradient-to-r from-white via-white to-transparent dark:from-slate-900 dark:via-slate-900 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex gap-1 p-2 overflow-x-auto scroll-smooth min-w-0 flex-1 [scrollbar-width:thin] overscroll-x-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {BASE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id, null)}
              className={cn(
                'shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
                active === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
              )}
            >
              {tab.label}
            </button>
          ))}
          {sharedTabs.map((inbox) => {
            const isActive = active === 'shared' && sharedInboxId === inbox.id
            return (
              <button
                key={inbox.id}
                type="button"
                onClick={() => onChange('shared', inbox.id)}
                className={cn(
                  'shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
                )}
              >
                {inbox.name}
              </button>
            )
          })}
        </div>

        {canScrollRight && (
          <button
            type="button"
            aria-label="Scroll tabs right"
            onClick={() => scrollBy(140)}
            className="absolute right-0 z-10 h-full px-1 bg-gradient-to-l from-white via-white to-transparent dark:from-slate-900 dark:via-slate-900 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
