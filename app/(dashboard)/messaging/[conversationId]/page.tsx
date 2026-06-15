'use client'

import { use } from 'react'
import { MessagingInbox } from '@/components/messaging/MessagingInbox'

export default function MessagingConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>
}) {
  const { conversationId } = use(params)
  return <MessagingInbox initialConversationId={conversationId} />
}
