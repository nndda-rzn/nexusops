import type { DbContext } from '@/shared/database/client'
import { containerMovements } from '@/shared/database/schema/containers'
import { generateId } from '@/shared/ids'

export async function appendContainerMovement(params: {
  containerId: string
  orgId: string
  movementType: string
  fromLocationType?: string | undefined
  fromLocationId?: string | undefined
  toLocationType: string
  toLocationId: string
  equipmentId?: string | undefined
  operatorId?: string | undefined
  notes?: string | undefined
}, db: DbContext): Promise<void> {
  await db.insert(containerMovements).values({
    id: generateId(),
    orgId: params.orgId,
    containerId: params.containerId,
    movementType: params.movementType as typeof containerMovements.$inferInsert['movementType'],
    fromLocationType: params.fromLocationType,
    fromLocationId: params.fromLocationId,
    toLocationType: params.toLocationType,
    toLocationId: params.toLocationId,
    equipmentId: params.equipmentId,
    operatorId: params.operatorId,
    notes: params.notes,
    movedAt: new Date(),
    isException: false,
  })
}
