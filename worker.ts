/**
 * Email Worker Process
 * Run as a SEPARATE PM2 process alongside the Next.js app.
 *
 * Start manually:   npx tsx worker.ts
 * PM2 (production): pm2 start ecosystem.config.js  (see below)
 *
 * This process:
 *   1. Connects to Redis
 *   2. Starts the BullMQ worker (processes email jobs)
 *   3. Starts the 15-min cron scheduler (queues appointment reminders)
 *   4. Gracefully shuts down on SIGTERM / SIGINT
 */

import 'dotenv/config'
import IORedis from 'ioredis'
import { startWorker, REDIS_URL } from './services/emailQueue'
import { startEmailScheduler }    from './services/emailScheduler'

console.log('[worker] starting email worker process...')
console.log(`[worker] Redis: ${REDIS_URL}`)
console.log(`[worker] Email provider: ${process.env.SENDGRID_API_KEY ? 'SendGrid' : 'SMTP'}`)

// Health-check connection (separate from BullMQ internals)
const redisProbe = new IORedis(REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false })
redisProbe.on('connect', () => console.log('[worker] Redis connected'))
redisProbe.on('error',  (err: Error) => console.error('[worker] Redis error:', err.message))

// Start BullMQ worker
const worker = startWorker()
console.log('[worker] BullMQ worker started')

// Start cron scheduler
startEmailScheduler()

// ─── Graceful shutdown ────────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
  console.log(`[worker] received ${signal} — shutting down gracefully...`)
  try {
    await worker.close()
    await redisProbe.quit()
    console.log('[worker] shutdown complete')
    process.exit(0)
  } catch (err) {
    console.error('[worker] error during shutdown:', (err as Error).message)
    process.exit(1)
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT',  () => shutdown('SIGINT'))
process.on('uncaughtException', (err) => {
  console.error('[worker] uncaughtException:', err.message)
  shutdown('uncaughtException')
})
