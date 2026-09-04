import { handoverRequests } from '@/shared/database/schema/intermodal'
import { generateId } from '@/shared/ids'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export interface RequestHandoverCommand {
  shipmentId: string
  legId: string
  nextLegId?: string | undefined
  fromEntityId: string
  toEntityId: string
  cargoDetails?: Record<string, unknown> | undefined
  handoverLocation?: string | undefined
  handoverLocationType?: string | undefined
}

export interface RequestHandoverResult {
  handoverId: string
  status: string
}

export async function requestHandoverCommand(
  cmd: RequestHandoverCommand,
  db: DbContext
): Promise<RequestHandoverResult> {
  const id = generateId()

  await db.insert(handoverRequests).values({
    id,
    shipmentId: cmd.shipmentId,
    legId: cmd.legId,
    nextLegId: cmd.nextLegId,
    fromEntityId: cmd.fromEntityId,
    toEntityId: cmd.toEntityId,
    cargoDetails: cmd.cargoDetails,
    handoverLocation: cmd.handoverLocation,
    handoverLocationType: cmd.handoverLocationType,
    status: 'PENDING',
    requestedAt: new Date(),
    createdAt: new Date(),
  })

  await eventBus.emit('intermodal.handover_requested', {
    type: 'intermodal.handover_requested',
    handoverId: id,
    shipmentId: cmd.shipmentId,
    legId: cmd.legId,
    fromEntityId: cmd.fromEntityId,
    toEntityId: cmd.toEntityId,
    occurredAt: new Date(),
  })

  return { handoverId: id, status: 'PENDING' }
}
