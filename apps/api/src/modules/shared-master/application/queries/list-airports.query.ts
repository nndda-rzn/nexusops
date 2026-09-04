import { airports } from '@/shared/database/schema/shared-master'
import { eq, sql } from 'drizzle-orm'
import { normalizePagination, toOffset, paginate } from '@/shared/pagination'
import type { DbContext } from '@/shared/database/client'

export async function listAirportsQuery(
  db: DbContext,
  params?: { page?: number; limit?: number }
) {
  const { page, limit } = normalizePagination(params ?? {})
  const offset = toOffset(page, limit)

  const whereClause = eq(airports.status, 'ACTIVE')

  const [rows, [countResult]] = await Promise.all([
    db.select().from(airports).where(whereClause).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(airports).where(whereClause),
  ])

  return paginate(rows, page, limit, countResult?.count ?? 0)
}

export async function getAirportQuery(id: string, db: DbContext) {
  const [row] = await db.select().from(airports).where(eq(airports.id, id)).limit(1)
  return row ?? null
}
