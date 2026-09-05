import { insertFlight, findFlightByIdOrFail } from '@/modules/aviation/infrastructure/repositories/flight.repository'
import { aircraft, airwayBills } from '@/shared/database/schema/aviation'
import { Flight } from '@/modules/aviation/domain/entities/flight.entity'
import { eventBus } from '@/shared/events'
import { generateId } from '@/shared/ids'
import type { DbContext } from '@/shared/database/client'

// ─── Aircraft ───
export interface RegisterAircraftCommand {
  orgId: string; registrationNumber: string; aircraftType: string
  maxPayloadKg?: string | undefined; maxVolumeM3?: string | undefined
  operatorOrgId?: string | undefined
}
export async function registerAircraftCommand(cmd: RegisterAircraftCommand, db: DbContext): Promise<{ id: string }> {
  const id = generateId(); const now = new Date()
  await db.insert(aircraft).values({
    id, orgId: cmd.orgId, registrationNumber: cmd.registrationNumber,
    aircraftType: cmd.aircraftType, maxPayloadKg: cmd.maxPayloadKg,
    maxVolumeM3: cmd.maxVolumeM3, operatorOrgId: cmd.operatorOrgId,
    status: 'ACTIVE', createdAt: now, updatedAt: now,
  })
  return { id }
}

// ─── Flight ───
export interface ScheduleFlightCommand {
  orgId: string; flightNumber: string; aircraftId: string
  scheduledDeparture: Date; scheduledArrival: Date
  originAirportId?: string | undefined; destinationAirportId?: string | undefined
}
export async function scheduleFlightCommand(cmd: ScheduleFlightCommand, db: DbContext): Promise<{ id: string }> {
  const id = generateId(); const now = new Date()
  const flight = Flight.fromSnapshot({
    id, orgId: cmd.orgId, flightNumber: cmd.flightNumber, aircraftId: cmd.aircraftId,
    scheduledDeparture: cmd.scheduledDeparture, scheduledArrival: cmd.scheduledArrival,
    originAirportId: cmd.originAirportId, destinationAirportId: cmd.destinationAirportId,
    status: 'SCHEDULED', createdAt: now, updatedAt: now,
  })
  await insertFlight(flight.toSnapshot(), db)
  await eventBus.emit('aviation.flight_scheduled', {
    type: 'aviation.flight_scheduled',
    flightId: id, orgId: cmd.orgId, flightNumber: cmd.flightNumber, occurredAt: now,
  })
  return { id }
}

// ─── AWB ───
export interface IssueAwbCommand {
  orgId: string; awbNumber: string; flightId: string
  grossWeightKg: string; pieces: number
  originAirportId?: string | undefined; destinationAirportId?: string | undefined
  isDangerousGoods?: boolean | undefined; dgClass?: string | undefined
  chargeableWeightKg?: string | undefined; volumeM3?: string | undefined
}
export async function issueAwbCommand(cmd: IssueAwbCommand, db: DbContext): Promise<{ id: string }> {
  const id = generateId(); const now = new Date()
  // P3R-05 FIX: verify the referenced flight exists before issuing
  await findFlightByIdOrFail(cmd.flightId, cmd.orgId, db)
  await db.insert(airwayBills).values({
    id, orgId: cmd.orgId, awbNumber: cmd.awbNumber, flightId: cmd.flightId,
    grossWeightKg: cmd.grossWeightKg, pieces: cmd.pieces,
    originAirportId: cmd.originAirportId,
    destinationAirportId: cmd.destinationAirportId,
    isDangerousGoods: cmd.isDangerousGoods ?? false,
    dgClass: cmd.dgClass,
    chargeableWeightKg: cmd.chargeableWeightKg,
    volumeM3: cmd.volumeM3,
    status: 'ISSUED', createdAt: now, updatedAt: now,
  })
  await eventBus.emit('aviation.cargo_accepted', {
    type: 'aviation.cargo_accepted',
    flightId: cmd.flightId, orgId: cmd.orgId,
    awbId: id, occurredAt: now,
  })
  return { id }
}
