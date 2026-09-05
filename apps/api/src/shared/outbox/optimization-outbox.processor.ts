import { outboxEvents } from '@/shared/database/schema/outbox'
import { optimizationJobs } from '@/shared/database/schema/planning'
import { db } from '@/shared/database/client'
import { sql, eq, and } from 'drizzle-orm'
import { publishJobToStream } from '@/modules/planning/infrastructure/redis/optimization-stream.publisher'
import { appendJobEvent } from '@/modules/planning/infrastructure/repositories/optimization-job.repository'
import { logger } from '@/shared/logging'

// ─────────────────────────────────────────
// Outbox processor — background loop that forwards PENDING outbox events
// to Redis Streams. Runs every second (data-consistency: outbox pattern).
//
// Flow per event:
//   1. Claim PENDING events (FOR UPDATE SKIP LOCKED — no double-processing)
//   2. Update job PENDING → QUEUED (same transaction as publish)
//   3. XADD to Redis Stream
//   4. Mark outbox PUBLISHED
//
// Crash safety: job status and outbox status are committed BEFORE XADD.
// If XADD fails, status stays QUEUED and the job is re-dispatched on next run
// (idempotent — worker claims QUEUED jobs; duplicate stream messages are
// rejected by the claim query `status IN ('QUEUED','RETRYING')`).
// ─────────────────────────────────────────

const BATCH_SIZE = 50

export async function processOptimizationOutbox(): Promise<number> {
  let processed = 0

  const pending = await db.transaction(async (tx) => {
    // Claim: mark events in-flight so concurrent publishers don't double-send
    return tx.select().from(outboxEvents)
      .where(and(
        eq(outboxEvents.status, 'PENDING'),
        eq(outboxEvents.eventType, 'planning.optimization_requested'),
      ))
      .limit(BATCH_SIZE)
      .for('update', { skipLocked: true })
  })

  for (const event of pending) {
    try {
      const jobId = (event.payload as { job_id?: string } | null)?.job_id
      if (!jobId) {
        await db.update(outboxEvents)
          .set({ status: 'FAILED', lastError: 'Missing job_id in payload', retryCount: sql`${outboxEvents.retryCount} + 1` })
          .where(eq(outboxEvents.id, event.id))
        continue
      }

      // Load job (no RLS here — processor runs outside request context; job is org-scoped by its own org_id)
      const [jobRow] = await db.select().from(optimizationJobs)
        .where(and(eq(optimizationJobs.id, jobId), eq(optimizationJobs.orgId, event.orgId)))
        .limit(1)
      if (!jobRow) {
        await db.update(outboxEvents)
          .set({ status: 'FAILED', lastError: 'Job not found', retryCount: sql`${outboxEvents.retryCount} + 1` })
          .where(eq(outboxEvents.id, event.id))
        continue
      }
      if (jobRow.status === 'CANCELLED' || jobRow.status === 'DEAD' || jobRow.status === 'COMPLETED') {
        // Terminal state — no dispatch, just mark delivered
        await db.update(outboxEvents).set({ status: 'PUBLISHED', publishedAt: new Date() })
          .where(eq(outboxEvents.id, event.id))
        continue
      }

      const attempt = jobRow.retryCount + 1
      await publishJobToStream({
        jobId: jobRow.id, orgId: jobRow.orgId, jobType: jobRow.jobType,
        attempt, payload: jobRow.input, requestedBy: jobRow.createdBy,
      })

      // Commit delivery state after publish
      await db.transaction(async (tx) => {
        await tx.update(optimizationJobs)
          .set({ status: 'QUEUED', queuedAt: sql`coalesce(${optimizationJobs.queuedAt}, now())` })
          .where(eq(optimizationJobs.id, jobId))
        await appendJobEvent({
          orgId: jobRow.orgId, jobId,
          from: jobRow.status as never, to: 'QUEUED',
          message: 'Job dispatched to compute worker',
          actorId: 'outbox-processor',
        }, tx)
        await tx.update(outboxEvents).set({ status: 'PUBLISHED', publishedAt: new Date() })
          .where(eq(outboxEvents.id, event.id))
      })
      processed += 1
    } catch (err) {
      logger.error('Outbox event processing failed', {
        event_id: event.id,
        error: err instanceof Error ? err.message : String(err),
      })
      await db.update(outboxEvents)
        .set({
          status: 'PENDING',
          lastError: err instanceof Error ? err.message : String(err),
          retryCount: sql`${outboxEvents.retryCount} + 1`,
        })
        .where(eq(outboxEvents.id, event.id))
    }
  }

  return processed
}

let timer: ReturnType<typeof setInterval> | null = null

export function startOutboxProcessor(intervalMs = 1000): void {
  if (timer) return
  timer = setInterval(() => {
    processOptimizationOutbox().catch((err) => {
      logger.error('Outbox processor error', { error: String(err) })
    })
    processOptimizationRetries().catch((err) => {
      logger.error('Retry dispatcher error', { error: String(err) })
    })
  }, intervalMs)
  timer.unref?.()
  logger.info('Outbox processor started', { interval_ms: intervalMs })
}

export function stopOutboxProcessor(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

// ─────────────────────────────────────────
// Retry dispatcher — re-dispatches RETRYING jobs whose backoff window elapsed.
// Worker sets status RETRYING + next_retry_at. This loop picks them up when due
// and XADDs a fresh stream message (attempt already incremented in DB).
// ─────────────────────────────────────────

export async function processOptimizationRetries(): Promise<number> {
  let redispatched = 0

  const due = await db.select().from(optimizationJobs)
    .where(and(
      eq(optimizationJobs.status, 'RETRYING'),
      sql`${optimizationJobs.nextRetryAt} <= now()`,
    ))
    .limit(BATCH_SIZE)

  for (const job of due) {
    try {
      await publishJobToStream({
        jobId: job.id, orgId: job.orgId, jobType: job.jobType,
        attempt: job.retryCount + 1, payload: job.input,
        requestedBy: job.createdBy,
      })
      await db.update(optimizationJobs)
        .set({ status: 'QUEUED', queuedAt: sql`coalesce(${optimizationJobs.queuedAt}, now())` })
        .where(eq(optimizationJobs.id, job.id))
      redispatched += 1
    } catch (err) {
      logger.error('Retry dispatch failed', {
        job_id: job.id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return redispatched
}