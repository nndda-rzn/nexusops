import { geofences } from '@/shared/database/schema/shared-master'
import { eq, and, sql } from 'drizzle-orm'
import { normalizePagination, toOffset, paginate } from '@/shared/pagination'
import type { DbContext } from '@/shared/database/client'

export type GeofenceType = 'TERMINAL' | 'PORT' | 'STATION' | 'WAREHOUSE' | 'AIRPORT' | 'CUSTOM'
export type GeofenceStatus = 'ACTIVE' | 'INACTIVE'

export async function listGeofencesQuery(
  db: DbContext,
  params?: { page?: number; limit?: number; geofenceType?: GeofenceType; status?: GeofenceStatus }
) {
  const { page, limit } = normalizePagination(params ?? {})
  const offset = toOffset(page, limit)

  const conditions = []
  if (params?.geofenceType) conditions.push(eq(geofences.geofenceType, params.geofenceType))
  if (params?.status) conditions.push(eq(geofences.status, params.status))
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [rows, [countResult]] = await Promise.all([
    db.select().from(geofences)
      .where(whereClause)
      .orderBy(geofences.createdAt)
      .limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(geofences).where(whereClause),
  ])

  return paginate(rows, page, limit, countResult?.count ?? 0)
}

export async function getGeofenceQuery(id: string, db: DbContext) {
  const [row] = await db.select().from(geofences).where(eq(geofences.id, id)).limit(1)
  return row ?? null
}

// Active geofences (containment candidates)
export async function listActiveGeofencesQuery(db: DbContext) {
  return db.select().from(geofences).where(eq(geofences.status, 'ACTIVE'))
}