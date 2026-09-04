import { vehiclePositions } from '@/shared/database/schema/road'
import { generateId } from '@/shared/ids'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export interface UpdateVehiclePositionCommand {
  vehicleId: string
  position: string  // WKT e.g. "POINT(106.827 -6.175)"
  speed?: string | undefined
  heading?: string | undefined
  recordedAt?: Date | undefined
}

export async function updateVehiclePositionCommand(
  cmd: UpdateVehiclePositionCommand,
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
