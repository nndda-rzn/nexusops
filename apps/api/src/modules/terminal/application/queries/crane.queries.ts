import { cranes } from '@/shared/database/schema/terminal'
import { eq, sql } from 'drizzle-orm'
import { normalizePagination, toOffset, paginate } from '@/shared/pagination'
import type { DbContext } from '@/shared/database/client'

export async function listCranesQuery(
  orgId: string,
  db: DbContext,
  paginationParams?: { page?: number; limit?: number },
) {
  const { page, limit } = normalizePagination(paginationParams ?? {})
  const offset = toOffset(page, limit)

  const whereClause = eq(cranes.orgId, orgId)

  const [rows, [countResult]] = await Promise.all([
    db.select({
      id: cranes.id, code: cranes.code, type: cranes.type,
      status: cranes.status, terminalId: cranes.terminalId,
      currentBerthId: cranes.currentBerthId,
      capacityTonnes: cranes.capacityTonnes, maxOutreachM: cranes.maxOutreachM,
    }).from(cranes).where(whereClause).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(cranes).where(whereClause),
  ])

  return paginate(rows, page, limit, countResult?.count ?? 0)
}
