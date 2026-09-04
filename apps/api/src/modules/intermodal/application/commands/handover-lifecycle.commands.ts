import { findHandoverByIdOrFail, updateHandoverStatus } from '@/modules/intermodal/infrastructure/repositories/handover.repository'
import { HandoverAlreadyRespondedError } from '@/modules/intermodal/domain/errors/handover.errors'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export interface CompleteHandoverCommand {
  handoverId: string
  completedBy: string
  entityId: string
}

export interface CancelHandoverCommand {
  handoverId: string
  cancelledBy: string
  entityId: string
  reason?: string | undefined
}

export async function completeHandoverCommand(
  cmd: CompleteHandoverCommand,
  db: DbContext
): Promise<void> {
  const handover = await findHandoverByIdOrFail(cmd.handoverId, cmd.entityId, db)

  if (handover.status !== 'ACCEPTED') {
    throw new HandoverAlreadyRespondedError(cmd.handoverId, handover.status)
  }

  const now = new Date()
  await updateHandoverStatus(cmd.handoverId, { status: 'COMPLETED', completedAt: now }, db)

  await eventBus.emit('intermodal.handover_completed', {
    type: 'intermodal.handover_completed',
    handoverId: cmd.handoverId,
    shipmentId: handover.shipmentId,
    legId: handover.legId,
    fromEntityId: handover.fromEntityId,
    toEntityId: handover.toEntityId,
    occurredAt: now,
    completedBy: cmd.completedBy,
  })
}

export async function cancelHandoverCommand(
  cmd: CancelHandoverCommand,
  db: DbContext
): Promise<void> {
  const handover = await findHandoverByIdOrFail(cmd.handoverId, cmd.entityId, db)

  if (handover.status === 'COMPLETED' || handover.status === 'CANCELLED') {
    throw new HandoverAlreadyRespondedError(cmd.handoverId, handover.status)
  }

  await updateHandoverStatus(cmd.handoverId, { status: 'CANCELLED' }, db)

  await eventBus.emit('intermodal.handover_cancelled', {
    type: 'intermodal.handover_cancelled',
    handoverId: cmd.handoverId,
    shipmentId: handover.shipmentId,
    fromEntityId: handover.fromEntityId,
    toEntityId: handover.toEntityId,
    reason: cmd.reason,
    occurredAt: new Date(),
    cancelledBy: cmd.cancelledBy,
  })
}
