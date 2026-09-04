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

  // C-03 FIX: correct error types for terminal states
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

  // S-04 FIX: added orgId filter to UPDATE
  await db
    .update(shipments)
    .set({ status: cmd.status, updatedAt: new Date() })
    .where(and(
      eq(shipments.id, cmd.shipmentId),
      eq(shipments.orgId, cmd.orgId),  // ← orgId filter added
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
