import { shipments } from '@/shared/database/schema/shipments'
import { eq, and } from 'drizzle-orm'
import { ShipmentNotFoundError } from '@/modules/shipments/domain/errors/shipment.errors'
import { ConflictError } from '@/shared/errors'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export interface UpdateShipmentStatusCommand {
  shipmentId: string
  orgId: string
  status:
    | 'BOOKED' | 'IN_TRANSIT' | 'AT_TERMINAL'
    | 'CUSTOMS_CLEARANCE' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED'
  actorId: string
}

// L-06 FIX: valid state transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT:             ['BOOKED', 'CANCELLED'],
  BOOKED:            ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT:        ['AT_TERMINAL', 'DELIVERED', 'DELAYED', 'CANCELLED'],
  AT_TERMINAL:       ['CUSTOMS_CLEARANCE', 'IN_TRANSIT', 'CANCELLED'],
  CUSTOMS_CLEARANCE: ['DELIVERED', 'ON_HOLD', 'CANCELLED'],
  DELIVERED:         ['COMPLETED'],
  ON_HOLD:           ['BOOKED', 'CANCELLED'],
  DELAYED:           ['IN_TRANSIT', 'CANCELLED'],
  COMPLETED:         [],
  CANCELLED:         [],
  DAMAGED:           ['CANCELLED'],
  LOST:              ['CANCELLED'],
}

export async function updateShipmentStatusCommand(
  cmd: UpdateShipmentStatusCommand,
  db: DbContext
): Promise<void> {
  const [shipment] = await db
    .select()
    .from(shipments)
    .where(and(eq(shipments.id, cmd.shipmentId), eq(shipments.orgId, cmd.orgId)))
    .limit(1)

  if (!shipment) throw new ShipmentNotFoundError(cmd.shipmentId)

  // L-03 FIX: correct error types for terminal states (already done in branch 1)
  if (shipment.status === 'COMPLETED') {
    throw new ConflictError(
      `Shipment '${cmd.shipmentId}' is already completed and cannot be updated.`,
      { shipment_id: cmd.shipmentId, current_status: shipment.status }
    )
  }
  if (shipment.status === 'CANCELLED') {
    throw new ConflictError(
      `Shipment '${cmd.shipmentId}' is already cancelled and cannot be updated.`,
      { shipment_id: cmd.shipmentId, current_status: shipment.status }
    )
  }

  // L-06 FIX: validate state transition
  const allowed = VALID_TRANSITIONS[shipment.status] ?? []
  if (!allowed.includes(cmd.status)) {
    throw new ConflictError(
      `Cannot transition shipment from '${shipment.status}' to '${cmd.status}'.`,
      { from: shipment.status, to: cmd.status, allowed }
    )
  }

  await db
    .update(shipments)
    .set({ status: cmd.status, updatedAt: new Date() })
    .where(and(
      eq(shipments.id, cmd.shipmentId),
      eq(shipments.orgId, cmd.orgId),
    ))

  await eventBus.emit('shipment.status_changed', {
    type: 'shipment.status_changed',
    shipmentId: cmd.shipmentId,
    orgId: cmd.orgId,
    from: shipment.status,
    to: cmd.status,
    occurredAt: new Date(),
    actorId: cmd.actorId,
  })
}
