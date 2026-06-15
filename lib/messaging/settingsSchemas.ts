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

export const messagingSettingsBody = z.object({
  messagingEnabled: z.boolean().optional(),
  messagingBusinessHours: z.record(z.string(), z.unknown()).nullable().optional(),
  defaultRoutingRules: z.record(messageReason, z.string()).nullable().optional(),
  webChatWidgetConfig: z
    .object({
      enabled: z.boolean().optional(),
      welcomeMessage: z.string().max(2000).optional(),
      offlineMessage: z.string().max(2000).optional(),
      primaryColor: z.string().max(20).optional(),
      position: z.enum(['bottom-right', 'bottom-left']).optional(),
    })
    .nullable()
    .optional(),
  portalConfig: z
    .object({
      baseUrl: z.string().max(500).optional(),
    })
    .nullable()
    .optional(),
})

export const REASON_OPTIONS = messageReason.options
