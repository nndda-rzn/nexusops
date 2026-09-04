import { vehicles, drivers, trips } from '@/shared/database/schema/road'
import { eq, and, sql } from 'drizzle-orm'
import { normalizePagination, toOffset, paginate } from '@/shared/pagination'
import type { DbContext } from '@/shared/database/client'

export async function listVehiclesQuery(
  orgId: string, db: DbContext,
  params?: { page?: number; limit?: number; status?: string }
) {
  const { page, limit } = normalizePagination(params ?? {})
  const offset = toOffset(page, limit)
  const whereClause = eq(vehicles.orgId, orgId)

  const [rows, [countResult]] = await Promise.all([
    db.select().from(vehicles).where(whereClause).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(vehicles).where(whereClause),
  ])
  return paginate(rows, page, limit, countResult?.count ?? 0)
}

export async function getVehicleQuery(id: string, orgId: string, db: DbContext) {
  const [row] = await db.select().from(vehicles)
    .where(and(eq(vehicles.id, id), eq(vehicles.orgId, orgId))).limit(1)
  return row ?? null
}

export async function listDriversQuery(
  orgId: string, db: DbContext,
  params?: { page?: number; limit?: number }
) {
  const { page, limit } = normalizePagination(params ?? {})
  const offset = toOffset(page, limit)
  const whereClause = eq(drivers.orgId, orgId)

  const [rows, [countResult]] = await Promise.all([
    db.select().from(drivers).where(whereClause).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(drivers).where(whereClause),
  ])
  return paginate(rows, page, limit, countResult?.count ?? 0)
}

export async function listTripsQuery(
  orgId: string, db: DbContext,
  params?: { page?: number; limit?: number; status?: string }
) {
  const { page, limit } = normalizePagination(params ?? {})
  const offset = toOffset(page, limit)
  const whereClause = eq(trips.orgId, orgId)

  const [rows, [countResult]] = await Promise.all([
    db.select().from(trips).where(whereClause).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(trips).where(whereClause),
  ])
  return paginate(rows, page, limit, countResult?.count ?? 0)
}

export async function getTripQuery(id: string, orgId: string, db: DbContext) {
  const [row] = await db.select().from(trips)
    .where(and(eq(trips.id, id), eq(trips.orgId, orgId))).limit(1)
  return row ?? null
}
