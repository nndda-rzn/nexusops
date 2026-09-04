import { findTripByIdOrFail, saveTrip } from '@/modules/road/infrastructure/repositories/trip.repository'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export async function assignTripCommand(
  cmd: { tripId: string; orgId: string; vehicleId: string; driverId: string },
  db: DbContext
): Promise<void> {
  const trip = await findTripByIdOrFail(cmd.tripId, cmd.orgId, db)
  trip.assign(cmd.vehicleId, cmd.driverId)
  trip.transition('ASSIGNED')
  await saveTrip(trip, db)
}

export async function dispatchTripCommand(
  cmd: { tripId: string; orgId: string; dispatcherId: string },
  db: DbContext
): Promise<void> {
  const trip = await findTripByIdOrFail(cmd.tripId, cmd.orgId, db)
  trip.dispatch(cmd.dispatcherId)
  trip.transition('DISPATCHED')
  await saveTrip(trip, db)

  await eventBus.emit('trip.dispatched', {
    type: 'trip.dispatched',
    tripId: cmd.tripId, orgId: cmd.orgId,
    referenceNumber: trip.referenceNumber,
    vehicleId: trip.toSnapshot().vehicleId,
    driverId: trip.toSnapshot().driverId,
    occurredAt: new Date(),
  })
}

export async function departTripCommand(
  cmd: { tripId: string; orgId: string; actualDeparture?: Date },
  db: DbContext
): Promise<void> {
  const trip = await findTripByIdOrFail(cmd.tripId, cmd.orgId, db)
  const actualDeparture = cmd.actualDeparture ?? new Date()
  trip.recordDeparture(actualDeparture)
  trip.transition('EN_ROUTE')
  await saveTrip(trip, db)

  await eventBus.emit('trip.departed', {
    type: 'trip.departed',
    tripId: cmd.tripId, orgId: cmd.orgId,
    referenceNumber: trip.referenceNumber,
    actualDeparture, occurredAt: new Date(),
  })
}

export async function arriveTripCommand(
  cmd: { tripId: string; orgId: string; actualArrival?: Date },
  db: DbContext
): Promise<void> {
  const trip = await findTripByIdOrFail(cmd.tripId, cmd.orgId, db)
  const actualArrival = cmd.actualArrival ?? new Date()
  trip.recordArrival(actualArrival)
  trip.transition('ARRIVED_DESTINATION')
  await saveTrip(trip, db)

  await eventBus.emit('trip.arrived', {
    type: 'trip.arrived',
    tripId: cmd.tripId, orgId: cmd.orgId,
    referenceNumber: trip.referenceNumber,
    actualArrival, occurredAt: new Date(),
  })
}

export async function completeTripCommand(
  cmd: { tripId: string; orgId: string },
  db: DbContext
): Promise<void> {
  const trip = await findTripByIdOrFail(cmd.tripId, cmd.orgId, db)
  trip.transition('COMPLETED')
  await saveTrip(trip, db)

  await eventBus.emit('trip.completed', {
    type: 'trip.completed',
    tripId: cmd.tripId, orgId: cmd.orgId,
    referenceNumber: trip.referenceNumber,
    occurredAt: new Date(),
  })
}
