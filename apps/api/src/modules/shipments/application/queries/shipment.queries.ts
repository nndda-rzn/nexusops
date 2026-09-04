import { shipments, shipmentLegs, shipmentMilestones } from '@/shared/database/schema/shipments'
import { eq, and, desc, sql } from 'drizzle-orm'
import { ShipmentNotFoundError } from '@/modules/shipments/domain/errors/shipment.errors'
import { normalizePagination, toOffset, paginate } from '@/shared/pagination'
import type { DbContext } from '@/shared/database/client'

export async function getShipmentQuery(shipmentId: string, orgId: string, db: DbContext) {
  const [shipment] = await db.select().from(shipments)
    .where(and(eq(shipments.id, shipmentId), eq(shipments.orgId, orgId)))
    .limit(1)

  if (!shipment) throw new ShipmentNotFoundError(shipmentId)

  const legs = await db.select().from(shipmentLegs)
    .where(and(eq(shipmentLegs.shipmentId, shipmentId), eq(shipmentLegs.orgId, orgId)))
    .orderBy(shipmentLegs.sequenceNumber)

  const milestones = await db.select().from(shipmentMilestones)
    .where(and(eq(shipmentMilestones.shipmentId, shipmentId), eq(shipmentMilestones.orgId, orgId)))
    .orderBy(desc(shipmentMilestones.occurredAt))

  return { ...shipment, legs, milestones }
}

export async function listShipmentsQuery(
  orgId: string,
  filter: { status?: string | undefined; page?: number | undefined; limit?: number | undefined },
  db: DbContext
) {
  const { page, limit } = normalizePagination({ page: filter.page, limit: filter.limit })
  const offset = toOffset(page, limit)

  const conditions = [eq(shipments.orgId, orgId)]
  if (filter.status) {
    conditions.push(eq(shipments.status, filter.status as typeof shipments.$inferSelect['status']))
  }

  const whereClause = and(...conditions)

  // Q-08 FIX: run count and data queries in parallel
  const [rows, [countResult]] = await Promise.all([
    db.select({
      id: shipments.id, shipmentType: shipments.shipmentType,
      referenceNumber: shipments.referenceNumber, status: shipments.status,
      origin: shipments.origin, destination: shipments.destination,
      cargoType: shipments.cargoType, customerId: shipments.customerId,
      createdAt: shipments.createdAt, updatedAt: shipments.updatedAt,
    }).from(shipments)
      .where(whereClause)
      .orderBy(desc(shipments.updatedAt))
      .limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` })
      .from(shipments)
      .where(whereClause),
  ])

  const total = countResult?.count ?? 0
  return paginate(rows, page, limit, total)
}
