import { portCalls } from '@/shared/database/schema/maritime'
import { eq, and, sql } from 'drizzle-orm'
import { normalizePagination, toOffset, paginate } from '@/shared/pagination'
import type { DbContext } from '@/shared/database/client'

export async function listPortCallsQuery(
  orgId: string,
  db: DbContext,
  params?: { page?: number; limit?: number; status?: string; voyageId?: string }
) {
  const { page, limit } = normalizePagination(params ?? {})
  const offset = toOffset(page, limit)

  const conditions = [eq(portCalls.orgId, orgId)]
  if (params?.voyageId) conditions.push(eq(portCalls.voyageId, params.voyageId))

  const whereClause = and(...conditions)

  const [rows, [countResult]] = await Promise.all([
    db.select().from(portCalls).where(whereClause).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(portCalls).where(whereClause),
  ])

  return paginate(rows, page, limit, countResult?.count ?? 0)
}
