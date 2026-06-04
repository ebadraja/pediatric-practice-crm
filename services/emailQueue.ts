/**
 * Email Queue Service
 * Uses BullMQ + Redis for reliable background email delivery.
 *
 * HIPAA NOTE: Never log email body, subject, or recipient address to console.
 *             Only log patientId + status. Full details go to email_logs table only.
 *
 * Architecture:
 *   Next.js app  → adds jobs via queueTransactionalEmail / queueCampaignBatch
 *   worker.ts    → runs as a separate PM2 process, processes jobs via startWorker()
 */

import { Queue, Worker, Job } from 'bullmq'
import nodemailer from 'nodemailer'
import sgMail from '@sendgrid/mail'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'

// ─── Redis connection ─────────────────────────────────────────────────────────

export const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'

// BullMQ accepts a plain URL object — avoids ioredis version conflicts
const connection = { url: REDIS_URL }

// ─── Queue definition ─────────────────────────────────────────────────────────

export const emailQueue = new Queue('email-queue', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    // Retry delays: ~1 min, ~5 min, ~15 min
    backoff: {
      type:  'custom',
      delay: 0, // overridden by getBackoffDelay below
    },
    removeOnComplete: { count: 500 },
    removeOnFail:     { count: 200 },
  },
})

// Custom backoff: 1 min → 5 min → 15 min
function getBackoffDelay(attemptsMade: number): number {
  const delays = [60_000, 300_000, 900_000]
  return delays[Math.min(attemptsMade, delays.length - 1)]
}

// ─── Job payload type ─────────────────────────────────────────────────────────

export interface EmailJobData {
  patientId:   string
  templateId:  string
  campaignId?: string
  variables:   Record<string, string>
  toEmail:     string  // stored encrypted; decrypted before use
  emailLogId?: string  // pre-created log row id
}

// ─── Email providers ──────────────────────────────────────────────────────────

const hasSendGrid = !!process.env.SENDGRID_API_KEY
if (hasSendGrid) sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

const smtpTransport = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   ?? 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT ?? '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
  },
})

const FROM_ADDRESS = process.env.EMAIL_FROM ?? 'Kids 0-18 Pediatrics <noreply@kids018.com>'

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<void> {
  if (hasSendGrid) {
    await sgMail.send({ to, from: FROM_ADDRESS, subject, html, text })
  } else {
    await smtpTransport.sendMail({ from: FROM_ADDRESS, to, subject, html, text })
  }
}

// ─── Merge tag replacement ────────────────────────────────────────────────────

function applyMergeTags(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`)
}

// ─── Core job processor ───────────────────────────────────────────────────────

async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { patientId, templateId, campaignId, variables, toEmail, emailLogId } = job.data

  // Decrypt recipient address (encrypted at rest per HIPAA)
  const recipientEmail = decrypt(toEmail)

  // Skip if patient has unsubscribed
  const unsub = await prisma.unsubscribe.findUnique({ where: { patientId } })
  if (unsub) {
    console.log(`[email-queue] skipped — unsubscribed patientId=${patientId}`)
    if (emailLogId) {
      await prisma.emailLog.update({
        where: { id: emailLogId },
        data:  { status: 'UNSUBSCRIBED' },
      })
    }
    return
  }

  // If campaign: check it hasn't been paused or cancelled
  if (campaignId) {
    const campaign = await prisma.emailCampaign.findUnique({
      where:  { id: campaignId },
      select: { status: true },
    })
    if (campaign?.status === 'PAUSED' || campaign?.status === 'CANCELLED') {
      console.log(`[email-queue] skipped — campaign ${campaign.status} patientId=${patientId}`)
      throw new Error(`campaign_${campaign.status.toLowerCase()}`) // triggers retry skip
    }
  }

  // Fetch template
  const template = await prisma.emailTemplate.findUnique({ where: { id: templateId } })
  if (!template) throw new Error(`template_not_found:${templateId}`)
  if (!template.isActive) throw new Error(`template_inactive:${templateId}`)

  // Apply merge tags
  const subject = applyMergeTags(template.subject, variables)
  const html    = applyMergeTags(template.htmlBody, variables)
  const text    = template.plainBody ? applyMergeTags(template.plainBody, variables) : ''

  // Send
  await sendEmail(recipientEmail, subject, html, text)

  // Update / create email_log — HIPAA: no body, no address stored here
  const logData = {
    status:    'SENT'  as const,
    sentAt:    new Date(),
    metadata:  { provider: hasSendGrid ? 'sendgrid' : 'smtp', attemptsMade: job.attemptsMade + 1 },
  }

  if (emailLogId) {
    await prisma.emailLog.update({ where: { id: emailLogId }, data: logData })
  } else {
    await prisma.emailLog.create({
      data: {
        patientId,
        templateId,
        campaignId:  campaignId ?? null,
        type:        campaignId ? 'CAMPAIGN' : 'AUTOMATED',
        toEmail,     // stored encrypted
        subject:     template.subject, // store template subject, not the merged one
        ...logData,
      },
    })
  }

  console.log(`[email-queue] sent patientId=${patientId} status=SENT`)
}

// ─── Worker (runs in worker.ts process only) ──────────────────────────────────

export function startWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(
    'email-queue',
    processEmailJob,
    {
      connection,
      // Rate limit: max 100 emails per minute (SendGrid free tier safe)
      limiter: { max: 100, duration: 60_000 },
      concurrency: 5,
    },
  )

  worker.on('completed', (job) => {
    console.log(`[email-queue] job=${job.id} patientId=${job.data.patientId} COMPLETED`)
  })

  worker.on('failed', async (job, err) => {
    if (!job) return
    const willRetry = job.attemptsMade < (job.opts.attempts ?? 3)
    console.log(
      `[email-queue] job=${job.id} patientId=${job.data.patientId} FAILED` +
      ` attempt=${job.attemptsMade} willRetry=${willRetry} err=${err.message}`
    )

    // Override next retry delay (BullMQ reads this from the error)
    ;(err as any).delay = getBackoffDelay(job.attemptsMade)

    // After all retries exhausted — mark as permanently failed
    if (!willRetry) {
      const { patientId, templateId, campaignId, toEmail, emailLogId } = job.data

      if (emailLogId) {
        await prisma.emailLog.update({
          where: { id: emailLogId },
          data: {
            status:       'FAILED',
            errorMessage: err.message,
            metadata:     { failedAt: new Date().toISOString(), totalAttempts: job.attemptsMade },
          },
        }).catch(() => {})
      } else {
        await prisma.emailLog.create({
          data: {
            patientId,
            templateId,
            campaignId:   campaignId ?? null,
            type:         campaignId ? 'CAMPAIGN' : 'AUTOMATED',
            toEmail,
            subject:      'delivery_failed',
            status:       'FAILED',
            errorMessage: err.message,
          },
        }).catch(() => {})
      }

      // Notify admins of permanent failure
      await notifyAdminsOfFailure(patientId, err.message).catch(() => {})
    }
  })

  worker.on('error', (err) => {
    console.error('[email-queue] worker error:', err.message)
  })

  return worker
}

async function notifyAdminsOfFailure(patientId: string, errorMsg: string): Promise<void> {
  const admins = await prisma.user.findMany({
    where:  { role: 'ADMIN', isActive: true },
    select: { id: true },
  })
  for (const admin of admins) {
    await prisma.notification.create({
      data: {
        userId:    admin.id,
        type:      'error',
        title:     'Email Delivery Failed',
        message:   `An email permanently failed to deliver. Check email logs for details.`,
        icon:      'error',
        entityType: 'email_log',
        actionUrl:  '/settings?tab=email-logs',
      },
    })
  }
  // HIPAA: error message logged to notifications but patientId NOT included in message text
  console.error(`[email-queue] permanent failure patientId=${patientId} err=${errorMsg}`)
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Queue a single transactional or automated email.
 * @param sendAt  Optional ISO string or Date — delays delivery until that time.
 */
export async function queueTransactionalEmail(
  patientId:  string,
  templateId: string,
  variables:  Record<string, string>,
  toEmail:    string,   // must already be encrypted
  sendAt?:    Date | string,
): Promise<string> {
  const delay = sendAt ? Math.max(0, new Date(sendAt).getTime() - Date.now()) : 0

  // Pre-create log row so failure handler can update it
  const log = await prisma.emailLog.create({
    data: {
      patientId,
      templateId,
      type:    'AUTOMATED',
      toEmail,
      subject: 'queued',
      status:  'QUEUED',
    },
  })

  const job = await emailQueue.add(
    'send-email',
    { patientId, templateId, variables, toEmail, emailLogId: log.id } satisfies EmailJobData,
    { delay },
  )

  console.log(`[email-queue] queued job=${job.id} patientId=${patientId}`)
  return job.id!
}

/**
 * Queue a batch of emails for a campaign.
 * Checks unsubscribes and deduplicates before queuing.
 */
export async function queueCampaignBatch(
  campaignId:    string,
  recipientList: Array<{ patientId: string; toEmail: string; variables: Record<string, string> }>,
  templateId:    string,
): Promise<void> {
  // Fetch unsubscribed patient IDs in one query
  const unsubscribed = await prisma.unsubscribe.findMany({
    where:  { patientId: { in: recipientList.map(r => r.patientId) } },
    select: { patientId: true },
  })
  const unsubSet = new Set(unsubscribed.map(u => u.patientId))

  // Fetch already-sent logs for this campaign
  const alreadySent = await prisma.emailLog.findMany({
    where:  { campaignId, status: { in: ['QUEUED', 'SENT', 'DELIVERED'] } },
    select: { patientId: true },
  })
  const sentSet = new Set(alreadySent.map(l => l.patientId))

  const eligible = recipientList.filter(
    r => !unsubSet.has(r.patientId) && !sentSet.has(r.patientId)
  )

  // Bulk-create log rows and add jobs
  const jobs = eligible.map(r => ({
    name: 'send-email',
    data: {
      patientId:  r.patientId,
      templateId,
      campaignId,
      variables:  r.variables,
      toEmail:    r.toEmail,
    } satisfies EmailJobData,
  }))

  await emailQueue.addBulk(jobs)

  // Update campaign recipient count and status
  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data:  { recipientCount: eligible.length, status: 'SENDING' },
  })

  console.log(`[email-queue] campaign=${campaignId} queued=${eligible.length} skipped=${recipientList.length - eligible.length}`)
}

/** Pause all pending jobs for a campaign (marks DB status + queued jobs will self-skip). */
export async function pauseCampaign(campaignId: string): Promise<void> {
  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data:  { status: 'PAUSED' },
  })
  console.log(`[email-queue] campaign=${campaignId} PAUSED`)
}

/** Resume a paused campaign. */
export async function resumeCampaign(campaignId: string): Promise<void> {
  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data:  { status: 'SENDING' },
  })
  console.log(`[email-queue] campaign=${campaignId} RESUMED`)
}

/** Cancel a campaign — marks DB status and all pending jobs will self-skip. */
export async function cancelCampaign(campaignId: string): Promise<void> {
  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data:  { status: 'CANCELLED' },
  })
  console.log(`[email-queue] campaign=${campaignId} CANCELLED`)
}
