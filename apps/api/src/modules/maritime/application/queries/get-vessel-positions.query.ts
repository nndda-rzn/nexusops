import { vesselPositions } from '@/shared/database/schema/maritime'
import { eq, desc } from 'drizzle-orm'
import { DEFAULT_POSITION_LIMIT } from '@/shared/pagination/query-helpers'
import type { DbContext } from '@/shared/database/client'

export async function getVesselPositionsQuery(
  vesselId: string,
  db: DbContext,
  limit = DEFAULT_POSITION_LIMIT
) {
  return db.select().from(vesselPositions)
    .where(eq(vesselPositions.vesselId, vesselId))
    .orderBy(desc(vesselPositions.recordedAt))
    .limit(limit)
}
