import { ports } from '@/shared/database/schema/shared-master'
import { eq, sql } from 'drizzle-orm'
import { normalizePagination, toOffset, paginate } from '@/shared/pagination'
import type { DbContext } from '@/shared/database/client'

export async function listPortsQuery(
  db: DbContext,
  params?: { page?: number; limit?: number; type?: 'SEA' | 'RIVER' | 'INLAND' }
) {
  const { page, limit } = normalizePagination(params ?? {})
  const offset = toOffset(page, limit)

  const whereClause = params?.type
    ? eq(ports.type, params.type)
    : eq(ports.status, 'ACTIVE')

  const [rows, [countResult]] = await Promise.all([
    db.select().from(ports).where(whereClause).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(ports).where(whereClause),
  ])

  return paginate(rows, page, limit, countResult?.count ?? 0)
}

export async function getPortQuery(id: string, db: DbContext) {
  const [row] = await db.select().from(ports).where(eq(ports.id, id)).limit(1)
  return row ?? null
}
