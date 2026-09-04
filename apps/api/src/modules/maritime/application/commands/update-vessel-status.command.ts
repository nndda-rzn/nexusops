import { findVesselByIdOrFail, saveVessel } from '@/modules/maritime/infrastructure/repositories/vessel.repository'
import type { VesselStatus } from '@/modules/maritime/domain/entities/vessel.entity'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export interface UpdateVesselStatusCommand {
  vesselId: string
  orgId: string
  status: VesselStatus
  actorId: string
}

export async function updateVesselStatusCommand(
  cmd: UpdateVesselStatusCommand,
  db: DbContext
): Promise<void> {
  const vessel = await findVesselByIdOrFail(cmd.vesselId, cmd.orgId, db)
  const from = vessel.status

  vessel.updateStatus(cmd.status)
  await saveVessel(vessel, db)

  await eventBus.emit('vessel.status_changed', {
    type: 'vessel.status_changed',
    vesselId: cmd.vesselId, orgId: cmd.orgId,
    from, to: cmd.status,
    occurredAt: new Date(), actorId: cmd.actorId,
  })
}
