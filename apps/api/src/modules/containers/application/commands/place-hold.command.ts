import { containerHolds } from '@/shared/database/schema/containers'
import { generateId } from '@/shared/ids'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'
import type { HoldType } from '@/modules/containers/domain/entities/container.entity'

export interface PlaceHoldCommand {
  containerId: string
  orgId: string
  holdType: HoldType
  reason: string
  notes?: string | undefined
  placedBy: string
}

export async function placeHoldCommand(
  cmd: PlaceHoldCommand,
  db: DbContext
): Promise<void> {
  await db.insert(containerHolds).values({
    id: generateId(),
    orgId: cmd.orgId,
    containerId: cmd.containerId,
    holdType: cmd.holdType,
    reason: cmd.reason,
    notes: cmd.notes,
    placedBy: cmd.placedBy,
    placedAt: new Date(),
    status: 'ACTIVE',
  })

  await eventBus.emit('container.held', {
    type: 'container.held',
    containerId: cmd.containerId,
    orgId: cmd.orgId,
    holdType: cmd.holdType,
    reason: cmd.reason,
    occurredAt: new Date(),
    actorId: cmd.placedBy,
  })
}
