import { findTripByIdOrFail, saveTrip } from '@/modules/road/infrastructure/repositories/trip.repository'
import { checkpoints } from '@/shared/database/schema/road'
import { vehicles } from '@/shared/database/schema/road'
import { eq, and } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export async function delayTripCommand(
  cmd: { tripId: string; orgId: string; delayMinutes: number },
  db: DbContext
): Promise<void> {
  const trip = await findTripByIdOrFail(cmd.tripId, cmd.orgId, db)
  trip.delay(cmd.delayMinutes)
  if (trip.status === 'EN_ROUTE' || trip.status === 'AT_CHECKPOINT') {
    trip.transition('DELAYED')
  }
  await saveTrip(trip, db)

  await eventBus.emit('trip.delayed', {
    type: 'trip.delayed',
    tripId: cmd.tripId, orgId: cmd.orgId,
    referenceNumber: trip.referenceNumber,
    delayMinutes: cmd.delayMinutes,
    totalDelayMinutes: trip.delayMinutes,
    occurredAt: new Date(),
  })
}

export async function recordCheckpointCommand(
  cmd: {
    tripId: string; orgId: string
    checkpointType: 'GATE_OUT' | 'WEIGH_BRIDGE' | 'TOLL' | 'DELIVERY_POINT'
    location?: string | undefined; notes?: string | undefined
  },
  db: DbContext
): Promise<{ id: string }> {
  const trip = await findTripByIdOrFail(cmd.tripId, cmd.orgId, db)
  trip.transition('AT_CHECKPOINT')
  await saveTrip(trip, db)

  const id = generateId()
  await db.insert(checkpoints).values({
    id, orgId: cmd.orgId, tripId: cmd.tripId,
    checkpointType: cmd.checkpointType,
    location: cmd.location,
    actualAt: new Date(),
    status: 'REACHED',
    notes: cmd.notes,
  })

  await eventBus.emit('trip.checkpoint_reached', {
    type: 'trip.checkpoint_reached',
    tripId: cmd.tripId, orgId: cmd.orgId,
    checkpointId: id, checkpointType: cmd.checkpointType,
    occurredAt: new Date(),
  })

  return { id }
}

export async function reportVehicleBreakdownCommand(
  cmd: { vehicleId: string; orgId: string; tripId?: string | undefined },
  db: DbContext
): Promise<void> {
  await db.update(vehicles)
    .set({ status: 'OFFLINE', updatedAt: new Date() })
    .where(and(eq(vehicles.id, cmd.vehicleId), eq(vehicles.orgId, cmd.orgId)))

  if (cmd.tripId) {
    const trip = await findTripByIdOrFail(cmd.tripId, cmd.orgId, db)
    trip.transition('BREAKDOWN')
    await saveTrip(trip, db)
  }

  await eventBus.emit('vehicle.breakdown', {
    type: 'vehicle.breakdown',
    vehicleId: cmd.vehicleId, orgId: cmd.orgId,
    tripId: cmd.tripId, occurredAt: new Date(),
  })
}
