import { trains } from '@/shared/database/schema/rail'
import { eq, and, sql } from 'drizzle-orm'
import { normalizePagination, toOffset, paginate } from '@/shared/pagination'
import type { DbContext } from '@/shared/database/client'

export async function listTrainsQuery(
  orgId: string,
  db: DbContext,
  params?: { page?: number; limit?: number; status?: string; serviceId?: string }
) {
  const { page, limit } = normalizePagination(params ?? {})
  const offset = toOffset(page, limit)

  const conditions = [eq(trains.orgId, orgId)]
  if (params?.serviceId) conditions.push(eq(trains.serviceId, params.serviceId))
  if (params?.status) conditions.push(
    eq(trains.status, params.status as 'SCHEDULED' | 'TRAINSET_ASSIGNED' | 'CREW_ASSIGNED' | 'LOADING' | 'READY_TO_DEPART' | 'EN_ROUTE' | 'ARRIVED' | 'UNLOADING' | 'COMPLETED' | 'DELAYED' | 'CANCELLED')
  )

  const whereClause = and(...conditions)

  const [rows, [countResult]] = await Promise.all([
    db.select().from(trains).where(whereClause).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(trains).where(whereClause),
  ])

  return paginate(rows, page, limit, countResult?.count ?? 0)
}

export async function getTrainQuery(id: string, orgId: string, db: DbContext) {
  const [row] = await db.select().from(trains)
    .where(and(eq(trains.id, id), eq(trains.orgId, orgId))).limit(1)
  if (!row) return null
  return row
}
