import { handoverRequests } from '@/shared/database/schema/intermodal'
import { eq, or } from 'drizzle-orm'
import type { DbContext } from '@/shared/database/client'

export async function listHandoverRequestsQuery(
  entityId: string,
  db: DbContext
) {
  return db.select().from(handoverRequests)
    .where(or(
      eq(handoverRequests.fromEntityId, entityId),
      eq(handoverRequests.toEntityId, entityId),
    ))
    .orderBy(handoverRequests.requestedAt)
}
