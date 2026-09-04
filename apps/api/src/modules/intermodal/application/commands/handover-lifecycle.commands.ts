import { handoverRequests } from '@/shared/database/schema/intermodal'
import { eq, and, or } from 'drizzle-orm'
import { HandoverNotFoundError, HandoverAlreadyRespondedError } from '@/modules/intermodal/domain/errors/handover.errors'
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
  const [handover] = await db.select().from(handoverRequests)
    .where(and(
      eq(handoverRequests.id, cmd.handoverId),
      or(
        eq(handoverRequests.fromEntityId, cmd.entityId),
        eq(handoverRequests.toEntityId, cmd.entityId),
      ),
    ))
    .limit(1)

  if (!handover) throw new HandoverNotFoundError(cmd.handoverId)
  if (handover.status !== 'ACCEPTED') {
    throw new HandoverAlreadyRespondedError(cmd.handoverId, handover.status)
  }

  const now = new Date()
  await db.update(handoverRequests)
    .set({ status: 'COMPLETED', completedAt: now })
    .where(eq(handoverRequests.id, cmd.handoverId))

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
  const [handover] = await db.select().from(handoverRequests)
    .where(and(
      eq(handoverRequests.id, cmd.handoverId),
      or(
        eq(handoverRequests.fromEntityId, cmd.entityId),
        eq(handoverRequests.toEntityId, cmd.entityId),
      ),
    ))
    .limit(1)

  if (!handover) throw new HandoverNotFoundError(cmd.handoverId)
  if (handover.status === 'COMPLETED' || handover.status === 'CANCELLED') {
    throw new HandoverAlreadyRespondedError(cmd.handoverId, handover.status)
  }

  await db.update(handoverRequests)
    .set({ status: 'CANCELLED' })
    .where(eq(handoverRequests.id, cmd.handoverId))

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
