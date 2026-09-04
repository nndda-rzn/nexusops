import { shipmentLegs, shipmentMilestones } from '@/shared/database/schema/shipments'
import { eq, and } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { ShipmentNotFoundError } from '@/modules/shipments/domain/errors/shipment.errors'
import { eventBus } from '@/shared/events'
import { shipments } from '@/shared/database/schema/shipments'
import type { DbContext } from '@/shared/database/client'

// ─── Legs ───

export async function addShipmentLegCommand(params: {
  orgId: string
  shipmentId: string
  sequenceNumber: string
  mode: 'SEA' | 'RAIL' | 'ROAD' | 'AIR'
  carrierOrgId?: string | undefined
  ownerOrgId: string
  origin: string
  destination: string
  scheduledDeparture?: Date | undefined
  scheduledArrival?: Date | undefined
}, db: DbContext) {
  const [shipment] = await db.select({ id: shipments.id }).from(shipments)
    .where(and(eq(shipments.id, params.shipmentId), eq(shipments.orgId, params.orgId)))
    .limit(1)
  if (!shipment) throw new ShipmentNotFoundError(params.shipmentId)

  const id = generateId()
  await db.insert(shipmentLegs).values({
    id, orgId: params.orgId, shipmentId: params.shipmentId,
    sequenceNumber: params.sequenceNumber, mode: params.mode,
    carrierOrgId: params.carrierOrgId, ownerOrgId: params.ownerOrgId,
    origin: params.origin, destination: params.destination,
    scheduledDeparture: params.scheduledDeparture,
    scheduledArrival: params.scheduledArrival,
    status: 'PLANNED', delayMinutes: '0',
    createdAt: new Date(), updatedAt: new Date(),
  })

  await eventBus.emit('shipment.leg_added', {
    type: 'shipment.leg_added',
    shipmentId: params.shipmentId, orgId: params.orgId,
    legId: id, sequenceNumber: params.sequenceNumber,
    mode: params.mode, origin: params.origin, destination: params.destination,
    occurredAt: new Date(),
  })

  return { id, sequenceNumber: params.sequenceNumber, mode: params.mode, status: 'PLANNED' }
}

export async function updateLegStatusCommand(params: {
  orgId: string
  legId: string
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DELAYED'
  actualDeparture?: Date | undefined
  actualArrival?: Date | undefined
  delayMinutes?: number | undefined
}, db: DbContext) {
  const [leg] = await db.select({ id: shipmentLegs.id, shipmentId: shipmentLegs.shipmentId })
    .from(shipmentLegs)
    .where(and(eq(shipmentLegs.id, params.legId), eq(shipmentLegs.orgId, params.orgId)))
    .limit(1)

  await db.update(shipmentLegs)
    .set({
      status: params.status,
      ...(params.actualDeparture ? { actualDeparture: params.actualDeparture } : {}),
      ...(params.actualArrival ? { actualArrival: params.actualArrival } : {}),
      ...(params.delayMinutes !== undefined ? { delayMinutes: String(params.delayMinutes) } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(shipmentLegs.id, params.legId), eq(shipmentLegs.orgId, params.orgId)))

  if (leg) {
    await eventBus.emit('shipment.leg_status_updated', {
      type: 'shipment.leg_status_updated',
      shipmentId: leg.shipmentId, orgId: params.orgId,
      legId: params.legId, status: params.status,
      occurredAt: new Date(),
    })
  }
}

export async function listLegsQuery(
  shipmentId: string, orgId: string, db: DbContext
) {
  return db.select().from(shipmentLegs)
    .where(and(
      eq(shipmentLegs.shipmentId, shipmentId),
      eq(shipmentLegs.orgId, orgId),
    ))
    .orderBy(shipmentLegs.sequenceNumber)
}

// ─── Milestones ───

export async function addMilestoneCommand(params: {
  orgId: string
  shipmentId: string
  legId?: string | undefined
  milestoneType: string
  location?: string | undefined
  recordedBy: string
}, db: DbContext) {
  const id = generateId()
  await db.insert(shipmentMilestones).values({
    id, orgId: params.orgId, shipmentId: params.shipmentId,
    legId: params.legId, milestoneType: params.milestoneType,
    location: params.location, recordedBy: params.recordedBy,
    occurredAt: new Date(), createdAt: new Date(),
  })

  await eventBus.emit('shipment.milestone_reached', {
    type: 'shipment.milestone_reached',
    shipmentId: params.shipmentId, orgId: params.orgId,
    milestoneType: params.milestoneType, location: params.location,
    occurredAt: new Date(), actorId: params.recordedBy,
  })

  return { id, milestoneType: params.milestoneType }
}
