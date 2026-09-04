import { shipmentExceptions } from '@/shared/database/schema/shipments'
import { eq, and, desc } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

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
  const [exception] = await db.select({ id: shipmentExceptions.id, shipmentId: shipmentExceptions.shipmentId })
    .from(shipmentExceptions)
    .where(and(eq(shipmentExceptions.id, params.exceptionId), eq(shipmentExceptions.orgId, params.orgId)))
    .limit(1)

  await db.update(shipmentExceptions)
    .set({ status: 'RESOLVED', resolvedBy: params.resolvedBy, resolvedAt: new Date() })
    .where(and(
      eq(shipmentExceptions.id, params.exceptionId),
      eq(shipmentExceptions.orgId, params.orgId),
    ))

  if (exception) {
    await eventBus.emit('shipment.exception_resolved', {
      type: 'shipment.exception_resolved',
      shipmentId: exception.shipmentId, orgId: params.orgId,
      exceptionId: params.exceptionId, resolvedBy: params.resolvedBy,
      occurredAt: new Date(),
    })
  }
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
