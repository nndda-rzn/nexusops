import { findFlightByIdOrFail, saveFlight } from '@/modules/aviation/infrastructure/repositories/flight.repository'
import { groundHandlings, airwayBills, flights } from '@/shared/database/schema/aviation'
import { eq, and } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { Flight } from '@/modules/aviation/domain/entities/flight.entity'
import { DomainNotFoundError } from '@/shared/errors'
import type { DbContext } from '@/shared/database/client'

// ─── Ground Handling ───

export interface CreateGroundHandlingCommand {
  orgId: string
  flightId: string
  airportId: string
  handlingType: 'INBOUND' | 'OUTBOUND' | 'TRANSIT'
  handlerOrgId?: string | undefined
  scheduledStart?: Date | undefined
  scheduledEnd?: Date | undefined
}

export async function createGroundHandlingCommand(cmd: CreateGroundHandlingCommand, db: DbContext): Promise<{ id: string }> {
  await findFlightByIdOrFail(cmd.flightId, cmd.orgId, db)
  const id = generateId()
  await db.insert(groundHandlings).values({
    id, orgId: cmd.orgId, flightId: cmd.flightId,
    airportId: cmd.airportId, handlingType: cmd.handlingType,
    handlerOrgId: cmd.handlerOrgId,
    scheduledStart: cmd.scheduledStart, scheduledEnd: cmd.scheduledEnd,
    status: 'SCHEDULED', createdAt: new Date(),
  })
  return { id }
}

export async function startGroundHandlingCommand(
  cmd: { orgId: string; handlingId: string },
  db: DbContext
): Promise<void> {
  await db.update(groundHandlings)
    .set({ status: 'IN_PROGRESS', actualStart: new Date() })
    .where(and(eq(groundHandlings.id, cmd.handlingId), eq(groundHandlings.orgId, cmd.orgId)))
}

export async function completeGroundHandlingCommand(
  cmd: { orgId: string; handlingId: string },
  db: DbContext
): Promise<void> {
  await db.update(groundHandlings)
    .set({ status: 'COMPLETED', actualEnd: new Date() })
    .where(and(eq(groundHandlings.id, cmd.handlingId), eq(groundHandlings.orgId, cmd.orgId)))
}

// ─── Flight Completion (ARRIVED → OFFLOADING → COMPLETED) ───

export async function offloadFlightCommand(
  cmd: { flightId: string; orgId: string },
  db: DbContext
): Promise<void> {
  const flight = await findFlightByIdOrFail(cmd.flightId, cmd.orgId, db)
  flight.transition('OFFLOADING')
  await saveFlight(flight, db)
}

export async function completeFlightCommand(
  cmd: { flightId: string; orgId: string },
  db: DbContext
): Promise<void> {
  await db.transaction(async (tx) => {
    const [flightRow] = await tx.select().from(flights)
      .where(and(eq(flights.id, cmd.flightId), eq(flights.orgId, cmd.orgId)))
      .limit(1)
    if (!flightRow) throw new DomainNotFoundError('flight-not-found', 'Flight Not Found',
      `Flight '${cmd.flightId}' does not exist.`, { flight_id: cmd.flightId })

    const flight = Flight.fromSnapshot({
      id: flightRow.id, orgId: flightRow.orgId,
      flightNumber: flightRow.flightNumber, aircraftId: flightRow.aircraftId,
      originAirportId: flightRow.originAirportId ?? undefined,
      destinationAirportId: flightRow.destinationAirportId ?? undefined,
      scheduledDeparture: flightRow.scheduledDeparture,
      scheduledArrival: flightRow.scheduledArrival,
      actualDeparture: flightRow.actualDeparture ?? undefined,
      actualArrival: flightRow.actualArrival ?? undefined,
      status: flightRow.status, slotId: flightRow.slotId ?? undefined,
      createdAt: flightRow.createdAt, updatedAt: flightRow.updatedAt,
    })
    flight.transition('COMPLETED')
    await tx.update(flights).set({ status: 'COMPLETED', updatedAt: new Date() })
      .where(and(eq(flights.id, cmd.flightId), eq(flights.orgId, cmd.orgId)))

    // Mark all AWB on this flight as DELIVERED
    await tx.update(airwayBills)
      .set({ status: 'DELIVERED', updatedAt: new Date() })
      .where(eq(airwayBills.flightId, cmd.flightId))
  })
}