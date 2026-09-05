import { airportSlots, airwayBills, cargoManifests, manifestItems, loadPlans, loadPlanItems } from '@/shared/database/schema/aviation'
import { eq, and, sql } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { findFlightByIdOrFail } from '@/modules/aviation/infrastructure/repositories/flight.repository'
import { DomainError, DomainNotFoundError } from '@/shared/errors'
import type { DbContext } from '@/shared/database/client'

// ─── Airport Slot ───

export interface CreateAirportSlotCommand {
  orgId: string
  airportId: string
  flightId?: string | undefined
  slotType: 'DEPARTURE' | 'ARRIVAL'
  scheduledTime: Date
}

export async function createAirportSlotCommand(cmd: CreateAirportSlotCommand, db: DbContext): Promise<{ id: string }> {
  if (cmd.flightId) {
    await findFlightByIdOrFail(cmd.flightId, cmd.orgId, db)
  }
  const id = generateId()
  await db.insert(airportSlots).values({
    id, orgId: cmd.orgId, airportId: cmd.airportId,
    flightId: cmd.flightId, slotType: cmd.slotType,
    scheduledTime: cmd.scheduledTime, status: 'REQUESTED',
    createdAt: new Date(),
  })
  return { id }
}

// ─── Cargo Manifest ───

export interface CreateManifestCommand {
  orgId: string
  flightId: string
}

export async function createManifestCommand(cmd: CreateManifestCommand, db: DbContext): Promise<{ id: string }> {
  const flight = await findFlightByIdOrFail(cmd.flightId, cmd.orgId, db)
  if (!['CARGO_ACCEPTANCE', 'SLOT_CONFIRMED'].includes(flight.status)) {
    throw new DomainError('manifest-not-allowed', 'Manifest Not Allowed',
      `Cannot create manifest — flight must be in CARGO_ACCEPTANCE.`, { flight_id: cmd.flightId, status: flight.status })
  }
  const id = generateId()
  await db.insert(cargoManifests).values({
    id, orgId: cmd.orgId, flightId: cmd.flightId,
    manifestNumber: `MF-${generateId()}`,
    totalPieces: 0, totalWeightKg: '0',
    status: 'OPEN', createdAt: new Date(),
  })
  return { id }
}

export interface AddAwbToManifestCommand {
  orgId: string
  manifestId: string
  awbId: string
  pieces: number
  weightKg: string
  positionCode?: string | undefined
}

export async function addAwbToManifestCommand(cmd: AddAwbToManifestCommand, db: DbContext): Promise<void> {
  await db.transaction(async (tx) => {
    const [manifest] = await tx.select().from(cargoManifests)
      .where(and(eq(cargoManifests.id, cmd.manifestId), eq(cargoManifests.orgId, cmd.orgId)))
      .limit(1)
    if (!manifest) throw new DomainNotFoundError('manifest-not-found', 'Manifest Not Found',
      `Cargo manifest '${cmd.manifestId}' does not exist.`, { manifest_id: cmd.manifestId })
    if (manifest.status !== 'OPEN') {
      throw new DomainError('manifest-not-open', 'Manifest Not Open',
        `Manifest is already '${manifest.status}'.`, { manifest_id: cmd.manifestId })
    }

    const [awb] = await tx.select().from(airwayBills)
      .where(and(eq(airwayBills.id, cmd.awbId), eq(airwayBills.orgId, cmd.orgId)))
      .limit(1)
    if (!awb) throw new DomainNotFoundError('awb-not-found', 'AWB Not Found',
      `Airway bill '${cmd.awbId}' does not exist.`, { awb_id: cmd.awbId })
    if (awb.flightId !== manifest.flightId) {
      throw new DomainError('awb-flight-mismatch', 'AWB Flight Mismatch',
        `AWB '${cmd.awbId}' does not belong to the manifest's flight.`,
        { awb_id: cmd.awbId, awb_flight: awb.flightId, manifest_flight: manifest.flightId })
    }

    await tx.insert(manifestItems).values({
      id: generateId(), manifestId: cmd.manifestId,
      awbId: cmd.awbId, pieces: cmd.pieces,
      weightKg: cmd.weightKg, positionCode: cmd.positionCode,
    })

    const [agg] = await tx.select({
      totalPieces: sql<number>`coalesce(sum(${manifestItems.pieces}), 0)::int`,
      totalWeightKg: sql<string>`coalesce(sum(${manifestItems.weightKg}), 0)::text`,
    }).from(manifestItems).where(eq(manifestItems.manifestId, cmd.manifestId))
    await tx.update(cargoManifests)
      .set({ totalPieces: agg?.totalPieces ?? 0, totalWeightKg: agg?.totalWeightKg ?? '0' })
      .where(eq(cargoManifests.id, cmd.manifestId))
  })
}

// ─── Load Plan ───

export interface CreateLoadPlanCommand {
  orgId: string
  flightId: string
  aircraftId: string
}

export async function createLoadPlanCommand(cmd: CreateLoadPlanCommand, db: DbContext): Promise<{ id: string }> {
  const flight = await findFlightByIdOrFail(cmd.flightId, cmd.orgId, db)
  if (!['MANIFEST_CLOSED', 'LOAD_PLANNED'].includes(flight.status)) {
    throw new DomainError('load-plan-not-allowed', 'Load Plan Not Allowed',
      `Cannot create load plan — flight must have closed manifest.`,
      { flight_id: cmd.flightId, status: flight.status })
  }
  const id = generateId()
  await db.insert(loadPlans).values({
    id, orgId: cmd.orgId, flightId: cmd.flightId,
    aircraftId: cmd.aircraftId, status: 'DRAFT', createdAt: new Date(),
  })
  return { id }
}

export interface AddAwbToLoadPlanCommand {
  orgId: string
  loadPlanId: string
  awbId: string
  compartment: 'FORWARD' | 'AFT' | 'BULK'
  weightKg: string
  position?: string | undefined
  uldNumber?: string | undefined
}

export async function addAwbToLoadPlanCommand(cmd: AddAwbToLoadPlanCommand, db: DbContext): Promise<void> {
  await db.transaction(async (tx) => {
    const [plan] = await tx.select().from(loadPlans)
      .where(and(eq(loadPlans.id, cmd.loadPlanId), eq(loadPlans.orgId, cmd.orgId)))
      .limit(1)
    if (!plan) throw new DomainNotFoundError('load-plan-not-found', 'Load Plan Not Found',
      `Load plan '${cmd.loadPlanId}' does not exist.`, { load_plan_id: cmd.loadPlanId })
    if (plan.status !== 'DRAFT') {
      throw new DomainError('load-plan-not-draft', 'Load Plan Not Draft',
        `Load plan is already '${plan.status}'.`, { load_plan_id: cmd.loadPlanId })
    }

    await tx.insert(loadPlanItems).values({
      id: generateId(), loadPlanId: cmd.loadPlanId,
      awbId: cmd.awbId, compartment: cmd.compartment,
      position: cmd.position, weightKg: cmd.weightKg,
      uldNumber: cmd.uldNumber,
    })

    const [agg] = await tx.select({
      totalPayloadKg: sql<string>`coalesce(sum(${loadPlanItems.weightKg}), 0)::text`,
    }).from(loadPlanItems).where(eq(loadPlanItems.loadPlanId, cmd.loadPlanId))
    await tx.update(loadPlans)
      .set({ totalPayloadKg: agg?.totalPayloadKg ?? '0' })
      .where(eq(loadPlans.id, cmd.loadPlanId))
  })
}