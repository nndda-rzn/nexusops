import { checkpoints, vehiclePositions } from '@/shared/database/schema/road'
import { eq, and, desc } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export async function getTripCheckpointsQuery(
  tripId: string, orgId: string, db: DbContext
) {
  return db.select().from(checkpoints)
    .where(and(eq(checkpoints.tripId, tripId), eq(checkpoints.orgId, orgId)))
    .orderBy(checkpoints.actualAt)
}

export async function getVehiclePositionsQuery(
  vehicleId: string, db: DbContext, limit = 100
) {
  return db.select().from(vehiclePositions)
    .where(eq(vehiclePositions.vehicleId, vehicleId))
    .orderBy(desc(vehiclePositions.recordedAt))
    .limit(limit)
}

export async function updateVehiclePositionCommand(
  cmd: {
    vehicleId: string
    position: string  // WKT
    speed?: string | undefined
    heading?: string | undefined
    recordedAt?: Date | undefined
  },
  db: DbContext
): Promise<void> {
  const recordedAt = cmd.recordedAt ?? new Date()
  await db.insert(vehiclePositions).values({
    id: generateId(), vehicleId: cmd.vehicleId,
    position: cmd.position, speed: cmd.speed,
    heading: cmd.heading, recordedAt,
  })

  await eventBus.emit('vehicle.position_updated', {
    type: 'vehicle.position_updated',
    vehicleId: cmd.vehicleId, position: cmd.position,
    speed: cmd.speed, heading: cmd.heading, recordedAt,
  })
}
