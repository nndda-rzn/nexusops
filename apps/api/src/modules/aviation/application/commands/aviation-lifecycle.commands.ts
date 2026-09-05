import { findFlightByIdOrFail, saveFlight } from '@/modules/aviation/infrastructure/repositories/flight.repository'
import { aircraft, cargoManifests, loadPlans, airportSlots, aviationCrewAssignments } from '@/shared/database/schema/aviation'
import { eq } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { eventBus } from '@/shared/events'
import type { FlightStatus } from '@/modules/aviation/domain/entities/flight.entity'
import type { DbContext } from '@/shared/database/client'

export async function transitionFlightCommand(
  cmd: { flightId: string; orgId: string; to: FlightStatus },
  db: DbContext
): Promise<void> {
  const flight = await findFlightByIdOrFail(cmd.flightId, cmd.orgId, db)
  flight.transition(cmd.to)
  await saveFlight(flight, db)
}

// P3R-05 FIX: dedicated delay command that emits the domain event
export async function delayFlightCommand(
  cmd: { flightId: string; orgId: string },
  db: DbContext
): Promise<void> {
  const flight = await findFlightByIdOrFail(cmd.flightId, cmd.orgId, db)
  flight.transition('DELAYED')
  await saveFlight(flight, db)
  await eventBus.emit('aviation.flight_delayed', {
    type: 'aviation.flight_delayed',
    flightId: cmd.flightId, orgId: cmd.orgId,
    occurredAt: new Date(),
  })
}

export async function departFlightCommand(
  cmd: { flightId: string; orgId: string; actualDeparture?: Date | undefined },
  db: DbContext
): Promise<void> {
  const flight = await findFlightByIdOrFail(cmd.flightId, cmd.orgId, db)
  const actualDeparture = cmd.actualDeparture ?? new Date()
  flight.recordDeparture(actualDeparture)
  flight.transition('DEPARTED')
  await saveFlight(flight, db)
  await eventBus.emit('aviation.flight_departed', {
    type: 'aviation.flight_departed',
    flightId: cmd.flightId, orgId: cmd.orgId,
    actualDeparture, occurredAt: new Date(),
  })
}

export async function arriveFlightCommand(
  cmd: { flightId: string; orgId: string; actualArrival?: Date | undefined },
  db: DbContext
): Promise<void> {
  const flight = await findFlightByIdOrFail(cmd.flightId, cmd.orgId, db)
  const actualArrival = cmd.actualArrival ?? new Date()
  flight.recordArrival(actualArrival)
  flight.transition('ARRIVED')
  await saveFlight(flight, db)
  await eventBus.emit('aviation.flight_arrived', {
    type: 'aviation.flight_arrived',
    flightId: cmd.flightId, orgId: cmd.orgId,
    actualArrival, occurredAt: new Date(),
  })
}

export async function confirmSlotCommand(
  cmd: { flightId: string; orgId: string; slotId: string },
  db: DbContext
): Promise<void> {
  await db.update(airportSlots).set({ status: 'CONFIRMED' }).where(eq(airportSlots.id, cmd.slotId))
  const flight = await findFlightByIdOrFail(cmd.flightId, cmd.orgId, db)
  flight.transition('SLOT_CONFIRMED')
  await saveFlight(flight, db)
  await eventBus.emit('aviation.slot_confirmed', {
    type: 'aviation.slot_confirmed',
    flightId: cmd.flightId, orgId: cmd.orgId,
    slotId: cmd.slotId, occurredAt: new Date(),
  })
}

export async function closeManifestCommand(
  cmd: { flightId: string; orgId: string; manifestId: string },
  db: DbContext
): Promise<void> {
  const now = new Date()
  await db.update(cargoManifests).set({ status: 'CLOSED', closedAt: now }).where(eq(cargoManifests.id, cmd.manifestId))
  const flight = await findFlightByIdOrFail(cmd.flightId, cmd.orgId, db)
  flight.transition('MANIFEST_CLOSED')
  await saveFlight(flight, db)
  await eventBus.emit('aviation.manifest_closed', {
    type: 'aviation.manifest_closed',
    flightId: cmd.flightId, orgId: cmd.orgId,
    manifestId: cmd.manifestId, occurredAt: now,
  })
}

export async function approveLoadPlanCommand(
  cmd: { flightId: string; orgId: string; loadPlanId: string; approvedBy: string },
  db: DbContext
): Promise<void> {
  const now = new Date()
  await db.update(loadPlans).set({ status: 'APPROVED', approvedBy: cmd.approvedBy, approvedAt: now }).where(eq(loadPlans.id, cmd.loadPlanId))
  const flight = await findFlightByIdOrFail(cmd.flightId, cmd.orgId, db)
  flight.transition('LOAD_PLANNED')
  await saveFlight(flight, db)
  await eventBus.emit('aviation.load_plan_approved', {
    type: 'aviation.load_plan_approved',
    flightId: cmd.flightId, orgId: cmd.orgId,
    loadPlanId: cmd.loadPlanId, occurredAt: now,
  })
}

export interface AssignAviationCrewCommand {
  orgId: string; flightId: string; employeeId?: string | undefined
  role: 'CAPTAIN' | 'FIRST_OFFICER' | 'LOADMASTER'
}
export async function assignAviationCrewCommand(cmd: AssignAviationCrewCommand, db: DbContext): Promise<{ id: string }> {
  const id = generateId()
  await db.insert(aviationCrewAssignments).values({
    id, orgId: cmd.orgId, flightId: cmd.flightId,
    employeeId: cmd.employeeId, role: cmd.role,
    status: 'ASSIGNED', createdAt: new Date(),
  })
  return { id }
}

export async function declareAogCommand(
  cmd: { aircraftId: string; orgId: string; flightId?: string | undefined },
  db: DbContext
): Promise<void> {
  await db.update(aircraft).set({ status: 'AOG', updatedAt: new Date() }).where(eq(aircraft.id, cmd.aircraftId))
  if (cmd.flightId) {
    const flight = await findFlightByIdOrFail(cmd.flightId, cmd.orgId, db)
    flight.transition('AOG')
    await saveFlight(flight, db)
  }
  await eventBus.emit('aviation.aog_declared', {
    type: 'aviation.aog_declared',
    aircraftId: cmd.aircraftId, orgId: cmd.orgId,
    flightId: cmd.flightId, occurredAt: new Date(),
  })
}
