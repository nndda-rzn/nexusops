import { vessels } from '@/shared/database/schema/maritime'
import { eq, and, sql } from 'drizzle-orm'
import { normalizePagination, toOffset, paginate } from '@/shared/pagination'
import type { DbContext } from '@/shared/database/client'

export async function listVesselsQuery(
  orgId: string,
  db: DbContext,
  params?: { page?: number; limit?: number; status?: string }
) {
  const { page, limit } = normalizePagination(params ?? {})
  const offset = toOffset(page, limit)

  const conditions = [eq(vessels.orgId, orgId)]
  if (params?.status) conditions.push(eq(vessels.status, params.status as 'ACTIVE' | 'IN_VOYAGE' | 'MAINTENANCE' | 'LAID_UP'))

  const whereClause = and(...conditions)

  const [rows, [countResult]] = await Promise.all([
    db.select().from(vessels).where(whereClause).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(vessels).where(whereClause),
  ])

  return paginate(rows, page, limit, countResult?.count ?? 0)
}
