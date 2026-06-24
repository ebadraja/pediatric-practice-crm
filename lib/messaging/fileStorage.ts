import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { MESSAGING_ATTACHMENTS_BUCKET, SIGNED_URL_EXPIRY_SECONDS } from '@/lib/messaging/fileSharingConfig'

export type UploadFileInput = {
  file: Buffer
  filename: string
  mimeType: string
  conversationId: string
  messageId: string
}

export type UploadFileResult = {
  storageKey: string
  originalName: string
  mimeType: string
  sizeBytes: number
}

let adminClient: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase storage is not configured')
  }
  adminClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return adminClient
}

export function resetSupabaseClientForTests(): void {
  adminClient = null
}

async function ensureBucket(client: SupabaseClient): Promise<void> {
  const { data: buckets } = await client.storage.listBuckets()
  const exists = buckets?.some((b) => b.name === MESSAGING_ATTACHMENTS_BUCKET)
  if (exists) return

  const { error } = await client.storage.createBucket(MESSAGING_ATTACHMENTS_BUCKET, {
    public: false,
    fileSizeLimit: 25 * 1024 * 1024,
  })
  if (error && !error.message.toLowerCase().includes('already exists')) {
    throw error
  }
}

export async function uploadFile(input: UploadFileInput): Promise<UploadFileResult> {
  const client = getSupabaseAdmin()
  await ensureBucket(client)

  const storageKey = `${input.conversationId}/${input.messageId}/${input.filename}`

  const { error } = await client.storage
    .from(MESSAGING_ATTACHMENTS_BUCKET)
    .upload(storageKey, input.file, {
      contentType: input.mimeType,
      upsert: false,
    })

  if (error) {
    throw new Error('Failed to store file')
  }

  return {
    storageKey,
    originalName: input.filename,
    mimeType: input.mimeType,
    sizeBytes: input.file.length,
  }
}

export async function getSignedDownloadUrl(storageKey: string): Promise<string> {
  const client = getSupabaseAdmin()
  const { data, error } = await client.storage
    .from(MESSAGING_ATTACHMENTS_BUCKET)
    .createSignedUrl(storageKey, SIGNED_URL_EXPIRY_SECONDS)

  if (error || !data?.signedUrl) {
    throw new Error('Failed to generate download URL')
  }

  return data.signedUrl
}

export async function deleteFile(storageKey: string): Promise<void> {
  const client = getSupabaseAdmin()
  const { error } = await client.storage.from(MESSAGING_ATTACHMENTS_BUCKET).remove([storageKey])
  if (error) {
    throw new Error('Failed to delete file')
  }
}
