import { yards, blocks, slots } from '@/shared/database/schema/yard'
import { eq, and, sql } from 'drizzle-orm'
import { normalizePagination, toOffset, paginate } from '@/shared/pagination'
import type { DbContext } from '@/shared/database/client'

export async function listYardsQuery(orgId: string, db: DbContext) {
  return db.select().from(yards).where(eq(yards.orgId, orgId))
}

export async function listBlocksQuery(orgId: string, yardId: string, db: DbContext) {
  return db.select().from(blocks)
    .where(and(eq(blocks.orgId, orgId), eq(blocks.yardId, yardId)))
}

export async function listSlotsQuery(
  orgId: string, blockId: string, db: DbContext,
  params?: { page?: number; limit?: number; status?: string }
) {
  const { page, limit } = normalizePagination(params ?? {})
  const offset = toOffset(page, limit)
  const conditions = [eq(slots.orgId, orgId), eq(slots.blockId, blockId)]
  if (params?.status) conditions.push(
    eq(slots.status, params.status as 'EMPTY' | 'OCCUPIED' | 'RESERVED' | 'BLOCKED')
  )
  const whereClause = and(...conditions)
  const [rows, [countResult]] = await Promise.all([
    db.select().from(slots).where(whereClause).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(slots).where(whereClause),
  ])
  return paginate(rows, page, limit, countResult?.count ?? 0)
}
