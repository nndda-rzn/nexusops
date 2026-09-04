import { stations } from '@/shared/database/schema/shared-master'
import { eq, sql } from 'drizzle-orm'
import { normalizePagination, toOffset, paginate } from '@/shared/pagination'
import type { DbContext } from '@/shared/database/client'

export async function listStationsQuery(
  db: DbContext,
  params?: { page?: number; limit?: number; type?: 'PORT' | 'DRY_PORT' | 'INLAND' | 'JUNCTION' | 'YARD' }
) {
  const { page, limit } = normalizePagination(params ?? {})
  const offset = toOffset(page, limit)

  const whereClause = params?.type
    ? eq(stations.type, params.type)
    : eq(stations.status, 'ACTIVE')

  const [rows, [countResult]] = await Promise.all([
    db.select().from(stations).where(whereClause).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(stations).where(whereClause),
  ])

  return paginate(rows, page, limit, countResult?.count ?? 0)
}

export async function getStationQuery(id: string, db: DbContext) {
  const [row] = await db.select().from(stations).where(eq(stations.id, id)).limit(1)
  return row ?? null
}
