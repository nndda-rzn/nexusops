import { vehiclePositions } from '@/shared/database/schema/road'
import { vehicles } from '@/shared/database/schema/road'
import { eq, and } from 'drizzle-orm'
import { VehicleNotFoundError } from '@/modules/road/domain/errors/road.errors'
import { generateId } from '@/shared/ids'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export interface UpdateVehiclePositionCommand {
  vehicleId: string
  orgId: string  // P-05 FIX: added for org ownership check — consistent with vessel position
  position: string  // WKT e.g. "POINT(106.827 -6.175)"
  speed?: string | undefined
  heading?: string | undefined
  recordedAt?: Date | undefined
}

export async function updateVehiclePositionCommand(
  cmd: UpdateVehiclePositionCommand,
  db: DbContext
): Promise<void> {
  // P-05 FIX: verify vehicle belongs to org before accepting position data
  const [vehicle] = await db.select({ id: vehicles.id })
    .from(vehicles)
    .where(and(eq(vehicles.id, cmd.vehicleId), eq(vehicles.orgId, cmd.orgId)))
    .limit(1)
  if (!vehicle) throw new VehicleNotFoundError(cmd.vehicleId)

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
