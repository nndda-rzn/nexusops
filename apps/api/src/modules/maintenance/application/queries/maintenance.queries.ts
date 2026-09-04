import { workOrders, failures, spareParts, maintenancePlans } from '@/shared/database/schema/maintenance'
import { eq, and, sql } from 'drizzle-orm'
import { normalizePagination, toOffset, paginate } from '@/shared/pagination'
import { WorkOrderNotFoundError } from '@/modules/maintenance/domain/errors/maintenance.errors'
import type { DbContext } from '@/shared/database/client'

export async function listWorkOrdersQuery(
  orgId: string, db: DbContext,
  params?: { page?: number; limit?: number; status?: string; assetId?: string }
) {
  const { page, limit } = normalizePagination(params ?? {})
  const offset = toOffset(page, limit)
  const conditions = [eq(workOrders.orgId, orgId)]
  if (params?.assetId) conditions.push(eq(workOrders.assetId, params.assetId))
  if (params?.status) conditions.push(
    eq(workOrders.status, params.status as 'DRAFT' | 'APPROVED' | 'SCHEDULED' | 'ASSIGNED' | 'IN_PROGRESS' | 'PENDING_PARTS' | 'COMPLETED' | 'CLOSED')
  )
  const whereClause = and(...conditions)
  const [rows, [countResult]] = await Promise.all([
    db.select().from(workOrders).where(whereClause).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(workOrders).where(whereClause),
  ])
  return paginate(rows, page, limit, countResult?.count ?? 0)
}

export async function getWorkOrderQuery(id: string, orgId: string, db: DbContext) {
  const [row] = await db.select().from(workOrders)
    .where(and(eq(workOrders.id, id), eq(workOrders.orgId, orgId))).limit(1)
  if (!row) throw new WorkOrderNotFoundError(id)
  return row
}

export async function listFailuresQuery(
  orgId: string, db: DbContext,
  params?: { page?: number; limit?: number; assetId?: string }
) {
  const { page, limit } = normalizePagination(params ?? {})
  const offset = toOffset(page, limit)
  const conditions = [eq(failures.orgId, orgId)]
  if (params?.assetId) conditions.push(eq(failures.assetId, params.assetId))
  const whereClause = and(...conditions)
  const [rows, [countResult]] = await Promise.all([
    db.select().from(failures).where(whereClause).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(failures).where(whereClause),
  ])
  return paginate(rows, page, limit, countResult?.count ?? 0)
}

export async function listSparePartsQuery(
  orgId: string, db: DbContext,
  params?: { page?: number; limit?: number }
) {
  const { page, limit } = normalizePagination(params ?? {})
  const offset = toOffset(page, limit)
  const whereClause = eq(spareParts.orgId, orgId)
  const [rows, [countResult]] = await Promise.all([
    db.select().from(spareParts).where(whereClause).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(spareParts).where(whereClause),
  ])
  return paginate(rows, page, limit, countResult?.count ?? 0)
}

export async function listMaintenancePlansQuery(orgId: string, assetId: string, db: DbContext) {
  return db.select().from(maintenancePlans)
    .where(and(eq(maintenancePlans.orgId, orgId), eq(maintenancePlans.assetId, assetId)))
}
