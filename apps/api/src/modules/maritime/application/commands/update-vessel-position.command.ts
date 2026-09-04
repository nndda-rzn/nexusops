import { vesselPositions } from '@/shared/database/schema/maritime'
import { generateId } from '@/shared/ids'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export interface UpdateVesselPositionCommand {
  vesselId: string
  position: string  // WKT e.g. "POINT(106.827 -6.175)"
  speed?: string | undefined
  heading?: string | undefined
  recordedAt?: Date | undefined
}

export async function updateVesselPositionCommand(
  cmd: UpdateVesselPositionCommand,
  db: DbContext
): Promise<void> {
  const recordedAt = cmd.recordedAt ?? new Date()

  await db.insert(vesselPositions).values({
    id: generateId(),
    vesselId: cmd.vesselId,
    position: cmd.position,
    speed: cmd.speed,
    heading: cmd.heading,
    recordedAt,
  })

  await eventBus.emit('vessel.position_updated', {
    type: 'vessel.position_updated',
    vesselId: cmd.vesselId,
    position: cmd.position,
    speed: cmd.speed,
    heading: cmd.heading,
    recordedAt,
  })
}
