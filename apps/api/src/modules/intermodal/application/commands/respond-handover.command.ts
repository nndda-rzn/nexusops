import { handoverRequests } from '@/shared/database/schema/intermodal'
import { eq } from 'drizzle-orm'
import { HandoverNotFoundError, HandoverAlreadyRespondedError } from '@/modules/intermodal/domain/errors/handover.errors'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export interface RespondHandoverCommand {
  handoverId: string
  response: 'ACCEPT' | 'REJECT'
  rejectionReason?: string | undefined
  respondedBy: string
}

export async function respondHandoverCommand(
  cmd: RespondHandoverCommand,
  db: DbContext
): Promise<void> {
  const [handover] = await db
    .select()
    .from(handoverRequests)
    .where(eq(handoverRequests.id, cmd.handoverId))
    .limit(1)

  if (!handover) throw new HandoverNotFoundError(cmd.handoverId)
  if (handover.status !== 'PENDING') {
    throw new HandoverAlreadyRespondedError(cmd.handoverId, handover.status)
  }

  const newStatus = cmd.response === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED'
  const now = new Date()

  await db.update(handoverRequests)
    .set({
      status: newStatus,
      ...(cmd.response === 'ACCEPT' ? { acceptedAt: now } : { rejectedAt: now }),
      ...(cmd.rejectionReason ? { rejectionReason: cmd.rejectionReason } : {}),
    })
    .where(eq(handoverRequests.id, cmd.handoverId))

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
