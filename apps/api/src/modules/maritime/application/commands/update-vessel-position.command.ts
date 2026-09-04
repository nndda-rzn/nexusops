import { vesselPositions } from '@/shared/database/schema/maritime'
import { findVesselByIdOrFail } from '@/modules/maritime/infrastructure/repositories/vessel.repository'
import { generateId } from '@/shared/ids'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export interface UpdateVesselPositionCommand {
  vesselId: string
  orgId: string  // F-06 FIX: added for org ownership check
  position: string  // WKT e.g. "POINT(106.827 -6.175)"
  speed?: string | undefined
  heading?: string | undefined
  recordedAt?: Date | undefined
}

export async function updateVesselPositionCommand(
  cmd: UpdateVesselPositionCommand,
  db: DbContext
): Promise<void> {
  // F-06 FIX: verify vessel belongs to org before accepting position data
  await findVesselByIdOrFail(cmd.vesselId, cmd.orgId, db)

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
