import { findHandoverByIdForRespond } from '@/modules/intermodal/infrastructure/repositories/handover.repository'
import { updateHandoverStatus } from '@/modules/intermodal/infrastructure/repositories/handover.repository'
import { HandoverNotFoundError, HandoverAlreadyRespondedError } from '@/modules/intermodal/domain/errors/handover.errors'
import { ForbiddenError } from '@/shared/errors'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export interface RespondHandoverCommand {
  handoverId: string
  response: 'ACCEPT' | 'REJECT'
  rejectionReason?: string | undefined
  respondedBy: string
  respondingEntityId: string    // S-03 FIX: added for ownership check
}

export async function respondHandoverCommand(
  cmd: RespondHandoverCommand,
  db: DbContext
): Promise<void> {
  // S-03 FIX: query with toEntityId ownership check
  const handover = await findHandoverByIdForRespond(cmd.handoverId, cmd.respondingEntityId, db)

  if (!handover) throw new HandoverNotFoundError(cmd.handoverId)

  // Guard: requester cannot respond to their own handover request
  if (handover.fromEntityId === cmd.respondingEntityId) {
    throw new ForbiddenError(
      'Requester cannot respond to their own handover request.',
      { handover_id: cmd.handoverId }
    )
  }

  if (handover.status !== 'PENDING') {
    throw new HandoverAlreadyRespondedError(cmd.handoverId, handover.status)
  }

  const newStatus = cmd.response === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED'
  const now = new Date()

  await updateHandoverStatus(cmd.handoverId, {
    status: newStatus,
    ...(cmd.response === 'ACCEPT' ? { acceptedAt: now } : { rejectedAt: now }),
    ...(cmd.rejectionReason ? { rejectionReason: cmd.rejectionReason } : {}),
  }, db)

  const eventType = cmd.response === 'ACCEPT'
    ? 'intermodal.handover_accepted'
    : 'intermodal.handover_rejected'

  await eventBus.emit(eventType, {
    type: eventType,
    handoverId: cmd.handoverId,
    shipmentId: handover.shipmentId,
    legId: handover.legId,
    fromEntityId: handover.fromEntityId,
    toEntityId: handover.toEntityId,
    occurredAt: now,
    respondedBy: cmd.respondedBy,
    ...(cmd.rejectionReason ? { rejectionReason: cmd.rejectionReason } : {}),
  })
}
