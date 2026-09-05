import { optimizationJobs, optimizationJobEvents } from '@/shared/database/schema/planning'
import { eq, and, sql } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { OptimizationJob } from '@/modules/planning/domain/entities/optimization-job.entity'
import { OptimizationJobNotFoundError } from '@/modules/planning/domain/errors/planning.errors'
import type { OptimizationJobStatus } from '@/modules/planning/domain/entities/optimization-job.entity'
import type { DbContext } from '@/shared/database/client'

type JobRow = typeof optimizationJobs.$inferSelect

function rowToJob(row: JobRow): OptimizationJob {
  return OptimizationJob.fromSnapshot({
    id: row.id, orgId: row.orgId, jobType: row.jobType,
    status: row.status, input: row.input,
    result: row.result ?? undefined,
    error: row.error ?? undefined,
    retryCount: row.retryCount, maxRetries: row.maxRetries,
    nextRetryAt: row.nextRetryAt ?? undefined,
    workerId: row.workerId ?? undefined,
    claimedAt: row.claimedAt ?? undefined,
    heartbeatAt: row.heartbeatAt ?? undefined,
    idempotencyKey: row.idempotencyKey ?? undefined,
    createdBy: row.createdBy, createdAt: row.createdAt,
    queuedAt: row.queuedAt ?? undefined,
    startedAt: row.startedAt ?? undefined,
    completedAt: row.completedAt ?? undefined,
    failedAt: row.failedAt ?? undefined,
  })
}

export async function insertOptimizationJob(job: OptimizationJob, db: DbContext): Promise<void> {
  const snap = job.toSnapshot()
  await db.insert(optimizationJobs).values({
    id: snap.id, orgId: snap.orgId, jobType: snap.jobType,
    status: snap.status, input: snap.input,
    retryCount: snap.retryCount, maxRetries: snap.maxRetries,
    idempotencyKey: snap.idempotencyKey,
    createdBy: snap.createdBy, createdAt: snap.createdAt,
  })
}

export async function findOptimizationJobById(id: string, orgId: string, db: DbContext): Promise<OptimizationJob | null> {
  const [row] = await db.select().from(optimizationJobs)
    .where(and(eq(optimizationJobs.id, id), eq(optimizationJobs.orgId, orgId))).limit(1)
  return row ? rowToJob(row) : null
}

export async function findOptimizationJobByIdOrFail(id: string, orgId: string, db: DbContext): Promise<OptimizationJob> {
  const job = await findOptimizationJobById(id, orgId, db)
  if (!job) throw new OptimizationJobNotFoundError(id)
  return job
}

export async function findJobByIdempotencyKey(orgId: string, key: string, db: DbContext): Promise<OptimizationJob | null> {
  const [row] = await db.select().from(optimizationJobs)
    .where(and(eq(optimizationJobs.orgId, orgId), eq(optimizationJobs.idempotencyKey, key))).limit(1)
  return row ? rowToJob(row) : null
}

export async function saveOptimizationJob(job: OptimizationJob, db: DbContext): Promise<void> {
  const snap = job.toSnapshot()
  await db.update(optimizationJobs)
    .set({
      status: snap.status, result: snap.result ?? null,
      error: snap.error ?? null,
      retryCount: snap.retryCount,
      nextRetryAt: snap.nextRetryAt ?? null,
      workerId: snap.workerId ?? null,
      claimedAt: snap.claimedAt ?? null,
      heartbeatAt: snap.heartbeatAt ?? null,
      queuedAt: snap.queuedAt ?? null,
      startedAt: snap.startedAt ?? null,
      completedAt: snap.completedAt ?? null,
      failedAt: snap.failedAt ?? null,
    })
    .where(and(eq(optimizationJobs.id, snap.id), eq(optimizationJobs.orgId, snap.orgId)))
}

export async function appendJobEvent(
  cmd: { orgId: string; jobId: string; from: OptimizationJobStatus | undefined; to: OptimizationJobStatus; message?: string | undefined; payload?: unknown; actorId?: string | undefined },
  db: DbContext
): Promise<void> {
  await db.insert(optimizationJobEvents).values({
    id: generateId(), orgId: cmd.orgId, jobId: cmd.jobId,
    fromStatus: cmd.from, toStatus: cmd.to,
    message: cmd.message, payload: cmd.payload ?? null,
    actorId: cmd.actorId,
    createdAt: new Date(),
  })
}

// Worker claim — atomic, tenant-scoped, returns the claimed row or null
export async function claimOptimizationJob(
  id: string, orgId: string, workerId: string, db: DbContext
): Promise<OptimizationJob | null> {
  const now = new Date()
  const rows = await db.update(optimizationJobs)
    .set({
      status: 'RUNNING', workerId,
      claimedAt: now, heartbeatAt: now,
      startedAt: sql`coalesce(${optimizationJobs.startedAt}, now())`,
    })
    .where(and(
      eq(optimizationJobs.id, id),
      eq(optimizationJobs.orgId, orgId),
      sql`${optimizationJobs.status} IN ('QUEUED', 'RETRYING')`,
    ))
    .returning()
  if (rows.length === 0) return null
  return rowToJob(rows[0]!)
}