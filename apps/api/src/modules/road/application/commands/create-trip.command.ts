import { insertTrip } from '@/modules/road/infrastructure/repositories/trip.repository'
import { Trip } from '@/modules/road/domain/entities/trip.entity'
import { generateId } from '@/shared/ids'
import type { DbContext } from '@/shared/database/client'

export interface CreateTripCommand {
  orgId: string
  origin: string
  destination: string
  vehicleId?: string | undefined
  driverId?: string | undefined
  shipmentId?: string | undefined
  containerId?: string | undefined
  routeId?: string | undefined
  scheduledDeparture?: Date | undefined
  scheduledArrival?: Date | undefined
  notes?: string | undefined
}

export async function createTripCommand(
  cmd: CreateTripCommand, db: DbContext
): Promise<{ id: string; referenceNumber: string }> {
  const id = generateId()
  const referenceNumber = `TRIP-${Date.now()}`
  const now = new Date()

  const trip = Trip.fromSnapshot({
    id, orgId: cmd.orgId, referenceNumber,
    origin: cmd.origin, destination: cmd.destination,
    vehicleId: cmd.vehicleId, driverId: cmd.driverId,
    shipmentId: cmd.shipmentId, containerId: cmd.containerId,
    routeId: cmd.routeId,
    scheduledDeparture: cmd.scheduledDeparture,
    scheduledArrival: cmd.scheduledArrival,
    status: 'PLANNED', delayMinutes: 0,
    notes: cmd.notes,
    createdAt: now, updatedAt: now,
  })

  await insertTrip(trip.toSnapshot(), db)
  return { id, referenceNumber }
}
