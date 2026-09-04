import { voyages } from '@/shared/database/schema/maritime'
import { eq, and, sql } from 'drizzle-orm'
import { normalizePagination, toOffset, paginate } from '@/shared/pagination'
import type { DbContext } from '@/shared/database/client'

export async function listVoyagesQuery(
  orgId: string,
  db: DbContext,
  params?: { page?: number; limit?: number; vesselId?: string }
) {
  const { page, limit } = normalizePagination(params ?? {})
  const offset = toOffset(page, limit)

  const conditions = [eq(voyages.orgId, orgId)]
  if (params?.vesselId) conditions.push(eq(voyages.vesselId, params.vesselId))

  const whereClause = and(...conditions)

  const [rows, [countResult]] = await Promise.all([
    db.select().from(voyages).where(whereClause).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(voyages).where(whereClause),
  ])

  return paginate(rows, page, limit, countResult?.count ?? 0)
}
