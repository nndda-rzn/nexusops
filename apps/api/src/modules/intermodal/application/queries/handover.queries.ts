import { handoverRequests } from '@/shared/database/schema/intermodal'
import { eq, or, and } from 'drizzle-orm'
import { HandoverNotFoundError } from '@/modules/intermodal/domain/errors/handover.errors'
import type { DbContext } from '@/shared/database/client'

export async function listHandoverRequestsQuery(entityId: string, db: DbContext) {
  return db.select().from(handoverRequests)
    .where(or(
      eq(handoverRequests.fromEntityId, entityId),
      eq(handoverRequests.toEntityId, entityId),
    ))
    .orderBy(handoverRequests.requestedAt)
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
