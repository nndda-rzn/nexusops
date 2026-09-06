import { routes } from '@/shared/database/schema/road'
import { eq, and, sql } from 'drizzle-orm'
import { normalizePagination, toOffset, paginate } from '@/shared/pagination'
import type { DbContext } from '@/shared/database/client'

export async function listRoutesQuery(
  orgId: string,
  db: DbContext,
  params?: { page?: number; limit?: number }
) {
  const { page, limit } = normalizePagination(params ?? {})
  const offset = toOffset(page, limit)
  const whereClause = eq(routes.orgId, orgId)

  const [rows, [countResult]] = await Promise.all([
    db.select().from(routes).where(whereClause).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(routes).where(whereClause),
  ])
  return paginate(rows, page, limit, countResult?.count ?? 0)
}

export async function getRouteQuery(id: string, orgId: string, db: DbContext) {
  const [row] = await db.select().from(routes)
    .where(and(eq(routes.id, id), eq(routes.orgId, orgId))).limit(1)
  return row ?? null
}