import { z } from 'zod'

const messageReason = z.enum([
  'SCHEDULING',
  'REFILL',
  'QUESTION',
  'URGENT',
  'INSURANCE',
  'RECORDS',
  'OTHER',
])

const conversationStatus = z.enum([
  'OPEN',
  'AWAITING_REPLY',
  'RESOLVED',
  'ARCHIVED',
])

const messageChannel = z.enum(['SMS', 'WEB_CHAT', 'PORTAL', 'SYSTEM'])

export const listConversationsQuery = z.object({
  inbox: z.enum(['all', 'unassigned', 'mine', 'shared']).default('all'),
  sharedInboxId: z.string().optional(),
  status: conversationStatus.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const createConversationBody = z.object({
  patientId: z.string().min(1),
  reason: messageReason.optional(),
})

export const patchConversationBody = z.object({
  status: conversationStatus.optional(),
  markRead: z.boolean().optional(),
})

export const sendMessageBody = z.object({
  content: z.string().min(1).max(10000),
  channel: messageChannel.default('PORTAL'),
  templateId: z.string().optional(),
})

export const assignConversationBody = z.object({
  assignedToId: z.string().nullable().optional(),
  assignedInboxId: z.string().nullable().optional(),
  reason: z.string().max(500).optional(),
})

export const internalNoteBody = z.object({
  content: z.string().min(1).max(10000),
})

export const listMessagesQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})
