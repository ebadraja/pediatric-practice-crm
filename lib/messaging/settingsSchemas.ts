import { z } from 'zod'

export const practiceFormSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(500).default(''),
  url: z.string().url().max(500),
  isActive: z.boolean().default(true),
})

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
      practiceForms: z.array(practiceFormSchema).optional(),
      defaultIntakeFormId: z.string().uuid().optional(),
    })
    .nullable()
    .optional(),
  smsProviderConfig: z
    .object({
      sendNotificationOnStaffReply: z.boolean().optional(),
      sendOtpCodes: z.boolean().optional(),
    })
    .nullable()
    .optional(),
})

export const REASON_OPTIONS = messageReason.options
