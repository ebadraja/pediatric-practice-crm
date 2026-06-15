export type InboxFilter = 'all' | 'unassigned' | 'mine'

export type ConversationStatus = 'OPEN' | 'AWAITING_REPLY' | 'RESOLVED' | 'ARCHIVED'

export type MessageChannel = 'SMS' | 'WEB_CHAT' | 'PORTAL' | 'SYSTEM'

export interface MessagingPatient {
  id: string
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
  parentName: string | null
  dateOfBirth: string
}

export interface MessagingStaffRef {
  id: string
  firstName: string
  lastName: string
}

export interface MessagingInboxRef {
  id: string
  name: string
}

export interface ConversationSummary {
  id: string
  patientId: string
  status: ConversationStatus
  assignedToId: string | null
  assignedInboxId: string | null
  lastMessageAt: string | null
  lastMessagePreview: string | null
  unreadCount: number
  reason: string | null
  createdAt: string
  updatedAt: string
  patient: MessagingPatient
  assignedTo: MessagingStaffRef | null
  assignedInbox: MessagingInboxRef | null
}

export interface SerializedMessage {
  id: string
  conversationId: string
  senderType: 'PATIENT' | 'STAFF' | 'SYSTEM'
  senderId: string | null
  senderName: string | null
  channel: MessageChannel
  content: string
  contentType: string
  deliveryStatus: string
  externalMessageId: string | null
  isInternalNote: boolean
  readAt: string | null
  metadata: unknown
  createdAt: string
}

export interface PatientContextData {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: string
  phone: string | null
  email: string | null
  parentName: string | null
  parentPhone: string | null
  insuranceProvider: string | null
  status: string
  appointments: Array<{
    id: string
    startTime: string
    type: string
    status: string
    provider: string | null
  }>
  callLogs: Array<{
    id: string
    startTime: string
    duration: number | null
    summary: string | null
    outcome: string | null
  }>
}

export interface StaffOption {
  id: string
  firstName: string
  lastName: string
  role: string
}
