import { trainServices, trainsets } from '@/shared/database/schema/rail'
import { eq, and, sql } from 'drizzle-orm'
import { normalizePagination, toOffset, paginate } from '@/shared/pagination'
import type { DbContext } from '@/shared/database/client'

export async function listTrainServicesQuery(
  orgId: string, db: DbContext,
  params?: { page?: number; limit?: number }
) {
  const { page, limit } = normalizePagination(params ?? {})
  const offset = toOffset(page, limit)
  const whereClause = eq(trainServices.orgId, orgId)

  const [rows, [countResult]] = await Promise.all([
    db.select().from(trainServices).where(whereClause).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(trainServices).where(whereClause),
  ])
  return paginate(rows, page, limit, countResult?.count ?? 0)
}

export async function listTrainsetsQuery(
  orgId: string, db: DbContext,
  params?: { page?: number; limit?: number }
) {
  const { page, limit } = normalizePagination(params ?? {})
  const offset = toOffset(page, limit)
  const whereClause = eq(trainsets.orgId, orgId)

  const [rows, [countResult]] = await Promise.all([
    db.select().from(trainsets).where(whereClause).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(trainsets).where(whereClause),
  ])
  return paginate(rows, page, limit, countResult?.count ?? 0)
}

export async function getPlatformAssignmentsQuery(
  trainId: string, orgId: string, db: DbContext
) {
  const { platformAssignments } = await import('@/shared/database/schema/rail')
  return db.select().from(platformAssignments)
    .where(and(eq(platformAssignments.trainId, trainId), eq(platformAssignments.orgId, orgId)))
}
