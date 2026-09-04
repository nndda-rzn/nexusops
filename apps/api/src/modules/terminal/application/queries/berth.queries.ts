import { berths, berthAssignments } from '@/shared/database/schema/terminal'
import { eq, and, sql } from 'drizzle-orm'
import { BerthNotFoundError } from '@/modules/terminal/domain/errors/berth.errors'
import { normalizePagination, toOffset, paginate } from '@/shared/pagination'
import type { DbContext } from '@/shared/database/client'

export async function listBerthsQuery(
  orgId: string,
  terminalId: string | undefined,
  db: DbContext,
  paginationParams?: { page?: number; limit?: number },
) {
  const { page, limit } = normalizePagination(paginationParams ?? {})
  const offset = toOffset(page, limit)

  const conditions = [eq(berths.orgId, orgId)]
  if (terminalId) conditions.push(eq(berths.terminalId, terminalId))
  const whereClause = and(...conditions)

  const [rows, [countResult]] = await Promise.all([
    db.select({
      id: berths.id, code: berths.code, name: berths.name,
      terminalId: berths.terminalId, lengthM: berths.lengthM,
      maxDraftM: berths.maxDraftM, maxVesselLoa: berths.maxVesselLoa,
      status: berths.status,
    }).from(berths).where(whereClause).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(berths).where(whereClause),
  ])

  return paginate(rows, page, limit, countResult?.count ?? 0)
}

export async function getBerthAssignmentsQuery(orgId: string, berthId: string, db: DbContext) {
  const [berth] = await db.select().from(berths)
    .where(and(eq(berths.id, berthId), eq(berths.orgId, orgId))).limit(1)
  if (!berth) throw new BerthNotFoundError(berthId)

  return db.select().from(berthAssignments)
    .where(and(
      eq(berthAssignments.berthId, berthId),
      eq(berthAssignments.orgId, orgId),
    ))
    .orderBy(berthAssignments.plannedStart)
}
