import { handoverRequests } from '@/shared/database/schema/intermodal'
import { eq, or, and, sql } from 'drizzle-orm'
import { HandoverNotFoundError } from '@/modules/intermodal/domain/errors/handover.errors'
import { normalizePagination, toOffset, paginate } from '@/shared/pagination'
import type { DbContext } from '@/shared/database/client'

export async function listHandoverRequestsQuery(
  entityId: string,
  db: DbContext,
  paginationParams?: { page?: number; limit?: number },
) {
  const { page, limit } = normalizePagination(paginationParams ?? {})
  const offset = toOffset(page, limit)

  const whereClause = or(
    eq(handoverRequests.fromEntityId, entityId),
    eq(handoverRequests.toEntityId, entityId),
  )

  const [rows, [countResult]] = await Promise.all([
    db.select().from(handoverRequests)
      .where(whereClause)
      .orderBy(handoverRequests.requestedAt)
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(handoverRequests).where(whereClause),
  ])

  return paginate(rows, page, limit, countResult?.count ?? 0)
}

export async function getHandoverByIdQuery(
  handoverId: string, entityId: string, db: DbContext
) {
  const [handover] = await db.select().from(handoverRequests)
    .where(and(
      eq(handoverRequests.id, handoverId),
      or(
        eq(handoverRequests.fromEntityId, entityId),
        eq(handoverRequests.toEntityId, entityId),
      ),
    ))
    .limit(1)

  if (!handover) throw new HandoverNotFoundError(handoverId)
  return handover
}
