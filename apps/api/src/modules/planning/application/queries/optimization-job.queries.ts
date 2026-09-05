import { optimizationJobs, optimizationJobEvents } from '@/shared/database/schema/planning'
import { eq, and, sql } from 'drizzle-orm'
import { normalizePagination, toOffset, paginate } from '@/shared/pagination'
import { findOptimizationJobByIdOrFail } from '@/modules/planning/infrastructure/repositories/optimization-job.repository'
import type { OptimizationJobStatus, OptimizationJobType } from '@/modules/planning/domain/entities/optimization-job.entity'
import type { DbContext } from '@/shared/database/client'

export async function getOptimizationJobQuery(id: string, orgId: string, db: DbContext) {
  return findOptimizationJobByIdOrFail(id, orgId, db)
}

export async function listOptimizationJobsQuery(
  orgId: string, db: DbContext,
  params?: { page?: number; limit?: number; status?: OptimizationJobStatus; jobType?: OptimizationJobType }
) {
  const { page, limit } = normalizePagination(params ?? {})
  const offset = toOffset(page, limit)
  const conditions = [eq(optimizationJobs.orgId, orgId)]
  if (params?.status) conditions.push(eq(optimizationJobs.status, params.status))
  if (params?.jobType) conditions.push(eq(optimizationJobs.jobType, params.jobType))
  const whereClause = and(...conditions)
  const [rows, [countResult]] = await Promise.all([
    db.select().from(optimizationJobs).where(whereClause).limit(limit).offset(offset)
      .orderBy(sql`${optimizationJobs.createdAt} desc`),
    db.select({ count: sql<number>`count(*)::int` }).from(optimizationJobs).where(whereClause),
  ])
  return paginate(rows, page, limit, countResult?.count ?? 0)
}

export async function listOptimizationJobEventsQuery(jobId: string, orgId: string, db: DbContext) {
  await findOptimizationJobByIdOrFail(jobId, orgId, db)
  return db.select().from(optimizationJobEvents)
    .where(and(eq(optimizationJobEvents.jobId, jobId), eq(optimizationJobEvents.orgId, orgId)))
    .orderBy(optimizationJobEvents.createdAt)
}