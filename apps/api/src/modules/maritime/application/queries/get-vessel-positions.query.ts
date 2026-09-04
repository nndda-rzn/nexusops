import { vesselPositions } from '@/shared/database/schema/maritime'
import { eq, desc } from 'drizzle-orm'
import type { DbContext } from '@/shared/database/client'

export async function getVesselPositionsQuery(
  vesselId: string,
  db: DbContext,
  limit = 100
) {
  return db.select().from(vesselPositions)
    .where(eq(vesselPositions.vesselId, vesselId))
    .orderBy(desc(vesselPositions.recordedAt))
    .limit(limit)
}
