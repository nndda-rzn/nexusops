import {
  findContainerByIdOrFail,
  saveContainer,
} from '@/modules/containers/infrastructure/repositories/container.repository'
import { appendContainerMovement } from '@/modules/containers/infrastructure/repositories/container-movement.repository'
import { containerHolds } from '@/shared/database/schema/containers'
import { eq, and } from 'drizzle-orm'
import { ContainerHoldActiveError } from '@/modules/containers/domain/errors/container.errors'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export interface MoveContainerCommand {
  containerId: string
  orgId: string
  toLocationType: string
  toLocationId: string
  equipmentId?: string | undefined
  operatorId?: string | undefined
  notes?: string | undefined
  actorId: string
}

export async function moveContainerCommand(
  cmd: MoveContainerCommand,
  db: DbContext
): Promise<void> {
  const container = await findContainerByIdOrFail(cmd.containerId, cmd.orgId, db)

  // H-02 FIX: added orgId filter to hold check
  const [activeHold] = await db
    .select()
    .from(containerHolds)
    .where(and(
      eq(containerHolds.containerId, cmd.containerId),
      eq(containerHolds.orgId, container.orgId),  // ← orgId filter added
      eq(containerHolds.status, 'ACTIVE'),
    ))
    .limit(1)

  if (activeHold) throw new ContainerHoldActiveError(cmd.containerId, activeHold.holdType)

  const prevLocationType = container.currentLocationType
  const prevLocationId = container.currentLocationId

  container.move(cmd.toLocationType, cmd.toLocationId)
  await saveContainer(container, db)

  await appendContainerMovement({
    containerId: container.id, orgId: container.orgId,
    movementType: 'YARD_MOVE',
    fromLocationType: prevLocationType, fromLocationId: prevLocationId,
    toLocationType: cmd.toLocationType, toLocationId: cmd.toLocationId,
    equipmentId: cmd.equipmentId, operatorId: cmd.operatorId, notes: cmd.notes,
  }, db)

  await eventBus.emit('container.moved', {
    type: 'container.moved',
    containerId: container.id, orgId: container.orgId,
    containerNumber: container.containerNumber,
    toLocationType: cmd.toLocationType, toLocationId: cmd.toLocationId,
    occurredAt: new Date(), actorId: cmd.actorId,
  })
}
