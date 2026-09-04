import { checkpoints, vehiclePositions } from '@/shared/database/schema/road'
import { eq, and, desc } from 'drizzle-orm'
import { DEFAULT_POSITION_LIMIT } from '@/shared/pagination/query-helpers'
import type { DbContext } from '@/shared/database/client'

export async function getTripCheckpointsQuery(
  tripId: string, orgId: string, db: DbContext
) {
  return db.select().from(checkpoints)
    .where(and(eq(checkpoints.tripId, tripId), eq(checkpoints.orgId, orgId)))
    .orderBy(checkpoints.actualAt)
}

export async function getVehiclePositionsQuery(
  vehicleId: string, db: DbContext, limit = DEFAULT_POSITION_LIMIT
) {
  return db.select().from(vehiclePositions)
    .where(eq(vehiclePositions.vehicleId, vehicleId))
    .orderBy(desc(vehiclePositions.recordedAt))
    .limit(limit)
}
