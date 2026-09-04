import {
  findContainerByIdOrFail,
  saveContainer,
} from '@/modules/containers/infrastructure/repositories/container.repository'
import { appendContainerMovement } from '@/modules/containers/infrastructure/repositories/container-movement.repository'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export interface DischargeContainerCommand {
  containerId: string
  orgId: string
  fromVesselId: string
  toBerthId: string
  equipmentId?: string | undefined
  operatorId?: string | undefined
  actorId: string
}

export async function dischargeContainerCommand(
  cmd: DischargeContainerCommand,
  db: DbContext
): Promise<void> {
  const container = await findContainerByIdOrFail(cmd.containerId, cmd.orgId, db)

  const prevStatus = container.status
  container.transitionTo('DISCHARGED')
  container.move('berth', cmd.toBerthId)
  await saveContainer(container, db)

  await appendContainerMovement({
    containerId: container.id, orgId: container.orgId,
    movementType: 'DISCHARGE',
    fromLocationType: 'vessel', fromLocationId: cmd.fromVesselId,
    toLocationType: 'berth', toLocationId: cmd.toBerthId,
    equipmentId: cmd.equipmentId, operatorId: cmd.operatorId,
  }, db)

  await eventBus.emit('container.discharged', {
    type: 'container.discharged',
    containerId: container.id, orgId: container.orgId,
    containerNumber: container.containerNumber,
    fromStatus: prevStatus,
    vesselId: cmd.fromVesselId, berthId: cmd.toBerthId,
    occurredAt: new Date(), actorId: cmd.actorId,
  })
}
