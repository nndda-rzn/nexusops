import { shipments } from '@/shared/database/schema/shipments'
import { generateId } from '@/shared/ids'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export interface CreateShipmentCommand {
  orgId: string
  shipmentType?: 'GROUP' | 'ENTITY' | undefined
  referenceNumber: string
  origin: string
  destination: string
  cargoType?: string | undefined
  totalWeight?: string | undefined
  totalVolume?: string | undefined
  customerId?: string | undefined
  createdBy: string
}

export interface CreateShipmentResult {
  id: string
  referenceNumber: string
  status: string
}

export async function createShipmentCommand(
  cmd: CreateShipmentCommand,
  db: DbContext
): Promise<CreateShipmentResult> {
  const id = generateId()

  await db.insert(shipments).values({
    id,
    orgId: cmd.orgId,
    shipmentType: cmd.shipmentType ?? 'ENTITY',
    referenceNumber: cmd.referenceNumber,
    status: 'DRAFT',
    origin: cmd.origin,
    destination: cmd.destination,
    cargoType: cmd.cargoType,
    totalWeight: cmd.totalWeight,
    totalVolume: cmd.totalVolume,
    customerId: cmd.customerId,
    createdBy: cmd.createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  await eventBus.emit('shipment.created', {
    type: 'shipment.created',
    shipmentId: id,
    orgId: cmd.orgId,
    referenceNumber: cmd.referenceNumber,
    shipmentType: cmd.shipmentType ?? 'ENTITY',
    occurredAt: new Date(),
    actorId: cmd.createdBy,
  })

  return { id, referenceNumber: cmd.referenceNumber, status: 'DRAFT' }
}
