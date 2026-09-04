import { flights } from '@/shared/database/schema/aviation'
import { eq, and } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { FlightNotFoundError } from '@/modules/aviation/domain/errors/aviation.errors'
import { Flight } from '@/modules/aviation/domain/entities/flight.entity'
import type { FlightProps } from '@/modules/aviation/domain/entities/flight.entity'
import type { DbContext } from '@/shared/database/client'

type FlightRow = typeof flights.$inferSelect

function rowToFlight(row: FlightRow): Flight {
  return Flight.fromSnapshot({
    id: row.id, orgId: row.orgId, flightNumber: row.flightNumber,
    aircraftId: row.aircraftId,
    originAirportId: row.originAirportId ?? undefined,
    destinationAirportId: row.destinationAirportId ?? undefined,
    scheduledDeparture: row.scheduledDeparture,
    scheduledArrival: row.scheduledArrival,
    actualDeparture: row.actualDeparture ?? undefined,
    actualArrival: row.actualArrival ?? undefined,
    status: row.status, slotId: row.slotId ?? undefined,
    createdAt: row.createdAt, updatedAt: row.updatedAt,
  })
}

export async function findFlightById(id: string, orgId: string, db: DbContext): Promise<Flight | null> {
  const [row] = await db.select().from(flights)
    .where(and(eq(flights.id, id), eq(flights.orgId, orgId))).limit(1)
  return row ? rowToFlight(row) : null
}

export async function findFlightByIdOrFail(id: string, orgId: string, db: DbContext): Promise<Flight> {
  const flight = await findFlightById(id, orgId, db)
  if (!flight) throw new FlightNotFoundError(id)
  return flight
}

export async function insertFlight(props: FlightProps, db: DbContext): Promise<void> {
  await db.insert(flights).values({
    id: props.id ?? generateId(),
    orgId: props.orgId, flightNumber: props.flightNumber,
    aircraftId: props.aircraftId,
    originAirportId: props.originAirportId,
    destinationAirportId: props.destinationAirportId,
    scheduledDeparture: props.scheduledDeparture,
    scheduledArrival: props.scheduledArrival,
    status: props.status,
    createdAt: props.createdAt, updatedAt: props.updatedAt,
  })
}

export async function saveFlight(flight: Flight, db: DbContext): Promise<void> {
  const snap = flight.toSnapshot()
  await db.update(flights)
    .set({
      status: snap.status, slotId: snap.slotId,
      actualDeparture: snap.actualDeparture, actualArrival: snap.actualArrival,
      updatedAt: snap.updatedAt,
    })
    .where(and(eq(flights.id, snap.id), eq(flights.orgId, snap.orgId)))
}
