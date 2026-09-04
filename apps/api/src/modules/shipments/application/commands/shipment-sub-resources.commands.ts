import { shipmentLegs, shipmentMilestones, shipmentExceptions } from '@/shared/database/schema/shipments'
import { eq, and, desc } from 'drizzle-orm'
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
  await db.update(shipmentLegs)
    .set({
      status: params.status,
      ...(params.actualDeparture ? { actualDeparture: params.actualDeparture } : {}),
      ...(params.actualArrival ? { actualArrival: params.actualArrival } : {}),
      ...(params.delayMinutes !== undefined ? { delayMinutes: String(params.delayMinutes) } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(shipmentLegs.id, params.legId), eq(shipmentLegs.orgId, params.orgId)))
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

// ─── Exceptions ───

export async function raiseExceptionCommand(params: {
  orgId: string
  shipmentId: string
  legId?: string | undefined
  exceptionType: string
  description: string
  raisedBy: string
}, db: DbContext) {
  const id = generateId()
  await db.insert(shipmentExceptions).values({
    id, orgId: params.orgId, shipmentId: params.shipmentId,
    legId: params.legId, exceptionType: params.exceptionType,
    description: params.description,
    status: 'OPEN', raisedBy: params.raisedBy,
    raisedAt: new Date(), createdAt: new Date(),
  })

  await eventBus.emit('shipment.exception_raised', {
    type: 'shipment.exception_raised',
    shipmentId: params.shipmentId, orgId: params.orgId,
    exceptionType: params.exceptionType, description: params.description,
    occurredAt: new Date(), actorId: params.raisedBy,
  })

  return { id, exceptionType: params.exceptionType, status: 'OPEN' }
}

export async function resolveExceptionCommand(params: {
  orgId: string
  exceptionId: string
  resolvedBy: string
}, db: DbContext) {
  await db.update(shipmentExceptions)
    .set({ status: 'RESOLVED', resolvedBy: params.resolvedBy, resolvedAt: new Date() })
    .where(and(
      eq(shipmentExceptions.id, params.exceptionId),
      eq(shipmentExceptions.orgId, params.orgId),
    ))
}

export async function listExceptionsQuery(
  shipmentId: string, orgId: string, db: DbContext
) {
  return db.select().from(shipmentExceptions)
    .where(and(
      eq(shipmentExceptions.shipmentId, shipmentId),
      eq(shipmentExceptions.orgId, orgId),
    ))
    .orderBy(desc(shipmentExceptions.raisedAt))
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
