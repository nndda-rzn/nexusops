import { OptimizationJob } from '@/modules/planning/domain/entities/optimization-job.entity'
import { insertOptimizationJob, findJobByIdempotencyKey, saveOptimizationJob, appendJobEvent, findOptimizationJobByIdOrFail } from '@/modules/planning/infrastructure/repositories/optimization-job.repository'
import { appendOutboxEvent } from '@/shared/outbox/outbox.repository'
import { eventBus } from '@/shared/events'
import { generateId } from '@/shared/ids'
import { DomainError } from '@/shared/errors'
import type { OptimizationJobType } from '@/modules/planning/domain/entities/optimization-job.entity'
import type { DbContext } from '@/shared/database/client'

export interface RequestOptimizationCommand {
  orgId: string
  jobType: OptimizationJobType
  input: unknown
  idempotencyKey?: string | undefined
  maxRetries?: number | undefined
  createdBy: string
}

export interface RequestOptimizationResult {
  id: string
  status: string
  jobType: OptimizationJobType
  created: boolean
}

// Idempotent: same (org, idempotency_key) returns the existing job.
export async function requestOptimizationCommand(
  cmd: RequestOptimizationCommand, db: DbContext
): Promise<RequestOptimizationResult> {
  if (cmd.idempotencyKey) {
    const existing = await findJobByIdempotencyKey(cmd.orgId, cmd.idempotencyKey, db)
    if (existing) {
      return {
        id: existing.id, status: existing.status,
        jobType: existing.jobType, created: false,
      }
    }
  }

  return db.transaction(async (tx) => {
    const id = generateId()
    const now = new Date()
    const job = OptimizationJob.create({
      id, orgId: cmd.orgId, jobType: cmd.jobType,
      input: cmd.input, status: 'PENDING', retryCount: 0,
      maxRetries: cmd.maxRetries ?? 3,
      idempotencyKey: cmd.idempotencyKey,
      createdBy: cmd.createdBy, createdAt: now,
    })

    await insertOptimizationJob(job, tx)
    await appendJobEvent({
      orgId: cmd.orgId, jobId: id, from: undefined, to: 'PENDING',
      message: 'Optimization job requested', actorId: cmd.createdBy,
    }, tx)
    await appendOutboxEvent({
      orgId: cmd.orgId, eventType: 'planning.optimization_requested',
      aggregateType: 'optimization_job', aggregateId: id,
      payload: { job_id: id },
    }, tx)

    await eventBus.emit('planning.optimization_requested', {
      type: 'planning.optimization_requested',
      jobId: id, orgId: cmd.orgId, jobType: cmd.jobType,
      requestedBy: cmd.createdBy, occurredAt: now,
    })

    return { id, status: 'PENDING', jobType: cmd.jobType, created: true }
  })
}

// ─── Cancel ───

export async function cancelOptimizationCommand(
  cmd: { jobId: string; orgId: string; cancelledBy: string }, db: DbContext
): Promise<void> {
  const job = await findOptimizationJobByIdOrFail(cmd.jobId, cmd.orgId, db)
  const from = job.status
  const cancellable: string[] = ['PENDING', 'QUEUED', 'FAILED', 'RETRYING']
  if (!cancellable.includes(from)) {
    throw new DomainError('optimization-job-not-cancellable', 'Optimization Job Not Cancellable',
      `Optimization job '${cmd.jobId}' cannot be cancelled from status '${from}'.`,
      { job_id: cmd.jobId, status: from })
  }

  await db.transaction(async (tx) => {
    job.transition('CANCELLED')
    await saveOptimizationJob(job, tx)
    await appendJobEvent({
      orgId: cmd.orgId, jobId: cmd.jobId, from, to: 'CANCELLED',
      message: 'Optimization job cancelled', actorId: cmd.cancelledBy,
    }, tx)
  })
}

// ─── Retry (from FAILED) ───

export async function retryOptimizationCommand(
  cmd: { jobId: string; orgId: string; actorId: string }, db: DbContext
): Promise<void> {
  const job = await findOptimizationJobByIdOrFail(cmd.jobId, cmd.orgId, db)
  if (job.status !== 'FAILED' && job.status !== 'DEAD') {
    throw new DomainError('optimization-job-not-retryable', 'Optimization Job Not Retryable',
      `Optimization job '${cmd.jobId}' can only be retried from FAILED/DEAD (current: '${job.status}').`,
      { job_id: cmd.jobId, status: job.status })
  }

  await db.transaction(async (tx) => {
    const from = job.status
    // Bypass state machine: reset retry counter and re-queue via outbox
    const snap = job.toSnapshot()
    snap.retryCount = 0
    snap.status = 'QUEUED'
    snap.error = undefined
    snap.queuedAt = new Date()
    const requeued = OptimizationJob.fromSnapshot(snap)
    await saveOptimizationJob(requeued, tx)
    await appendJobEvent({
      orgId: cmd.orgId, jobId: cmd.jobId, from, to: 'QUEUED',
      message: 'Optimization job manually retried', actorId: cmd.actorId,
    }, tx)
    await appendOutboxEvent({
      orgId: cmd.orgId, eventType: 'planning.optimization_requested',
      aggregateType: 'optimization_job', aggregateId: cmd.jobId,
      payload: { job_id: cmd.jobId, retry: true },
    }, tx)
  })
}