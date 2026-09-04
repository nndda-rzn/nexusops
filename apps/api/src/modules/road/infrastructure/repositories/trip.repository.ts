import { trips } from '@/shared/database/schema/road'
import { eq, and } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { TripNotFoundError } from '@/modules/road/domain/errors/road.errors'
import { Trip } from '@/modules/road/domain/entities/trip.entity'
import type { TripProps } from '@/modules/road/domain/entities/trip.entity'
import type { DbContext } from '@/shared/database/client'

type TripRow = typeof trips.$inferSelect

function rowToTrip(row: TripRow): Trip {
  return Trip.fromSnapshot({
    id: row.id, orgId: row.orgId, referenceNumber: row.referenceNumber,
    vehicleId: row.vehicleId ?? undefined, driverId: row.driverId ?? undefined,
    shipmentId: row.shipmentId ?? undefined, containerId: row.containerId ?? undefined,
    origin: row.origin, destination: row.destination,
    routeId: row.routeId ?? undefined,
    scheduledDeparture: row.scheduledDeparture ?? undefined,
    scheduledArrival: row.scheduledArrival ?? undefined,
    actualDeparture: row.actualDeparture ?? undefined,
    actualArrival: row.actualArrival ?? undefined,
    status: row.status, delayMinutes: row.delayMinutes,
    dispatcherId: row.dispatcherId ?? undefined,
    notes: row.notes ?? undefined,
    cancellationReason: row.cancellationReason ?? undefined,
    createdAt: row.createdAt, updatedAt: row.updatedAt,
  })
}

export async function findTripById(id: string, orgId: string, db: DbContext): Promise<Trip | null> {
  const [row] = await db.select().from(trips)
    .where(and(eq(trips.id, id), eq(trips.orgId, orgId))).limit(1)
  return row ? rowToTrip(row) : null
}

export async function findTripByIdOrFail(id: string, orgId: string, db: DbContext): Promise<Trip> {
  const trip = await findTripById(id, orgId, db)
  if (!trip) throw new TripNotFoundError(id)
  return trip
}

export async function insertTrip(props: TripProps, db: DbContext): Promise<void> {
  await db.insert(trips).values({
    id: props.id ?? generateId(),
    orgId: props.orgId, referenceNumber: props.referenceNumber,
    vehicleId: props.vehicleId, driverId: props.driverId,
    shipmentId: props.shipmentId, containerId: props.containerId,
    origin: props.origin, destination: props.destination,
    routeId: props.routeId,
    scheduledDeparture: props.scheduledDeparture,
    scheduledArrival: props.scheduledArrival,
    status: props.status, delayMinutes: props.delayMinutes,
    dispatcherId: props.dispatcherId, notes: props.notes,
    createdAt: props.createdAt, updatedAt: props.updatedAt,
  })
}

export async function saveTrip(trip: Trip, db: DbContext): Promise<void> {
  const snap = trip.toSnapshot()
  await db.update(trips)
    .set({
      status: snap.status, vehicleId: snap.vehicleId, driverId: snap.driverId,
      actualDeparture: snap.actualDeparture, actualArrival: snap.actualArrival,
      delayMinutes: snap.delayMinutes, dispatcherId: snap.dispatcherId,
      cancellationReason: snap.cancellationReason, updatedAt: snap.updatedAt,
    })
    .where(and(eq(trips.id, snap.id), eq(trips.orgId, snap.orgId)))
}
