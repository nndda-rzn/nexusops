import { terminals, gates, berths, cranes } from '@/shared/database/schema/terminal'
import { eq, and } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

// ─── Terminal ───

export async function createTerminalCommand(params: {
  orgId: string
  code: string
  name: string
  type: 'CONTAINER' | 'BULK' | 'LIQUID' | 'RORO' | 'MULTIPURPOSE'
  maxVesselLoa?: string | undefined
  maxVesselDraft?: string | undefined
  annualCapacityTeu?: number | undefined
}, db: DbContext) {
  const id = generateId()
  await db.insert(terminals).values({
    id, orgId: params.orgId, code: params.code, name: params.name,
    type: params.type,
    maxVesselLoa: params.maxVesselLoa, maxVesselDraft: params.maxVesselDraft,
    annualCapacityTeu: params.annualCapacityTeu,
    createdAt: new Date(), updatedAt: new Date(),
  })

  await eventBus.emit('terminal.created', {
    type: 'terminal.created',
    terminalId: id, orgId: params.orgId,
    code: params.code, name: params.name, terminalType: params.type,
    occurredAt: new Date(),
  })

  return { id, code: params.code, name: params.name }
}

export async function listTerminalsQuery(orgId: string, db: DbContext) {
  return db.select().from(terminals).where(eq(terminals.orgId, orgId))
}

// ─── Gate ───

export async function createGateCommand(params: {
  orgId: string
  terminalId: string
  gateNumber: string
  type: 'IN' | 'OUT' | 'INOUT'
  laneCount?: number | undefined
}, db: DbContext) {
  const id = generateId()
  await db.insert(gates).values({
    id, orgId: params.orgId, terminalId: params.terminalId,
    gateNumber: params.gateNumber, type: params.type,
    laneCount: params.laneCount ?? 1,
    status: 'CLOSED',
    createdAt: new Date(), updatedAt: new Date(),
  })

  await eventBus.emit('terminal.gate_created', {
    type: 'terminal.gate_created',
    gateId: id, orgId: params.orgId, terminalId: params.terminalId,
    gateNumber: params.gateNumber, gateType: params.type,
    occurredAt: new Date(),
  })

  return { id, gateNumber: params.gateNumber, type: params.type }
}

export async function listGatesQuery(orgId: string, terminalId: string, db: DbContext) {
  return db.select().from(gates)
    .where(and(eq(gates.orgId, orgId), eq(gates.terminalId, terminalId)))
}

export async function updateGateStatusCommand(params: {
  orgId: string
  gateId: string
  status: 'OPEN' | 'CLOSED' | 'RESTRICTED'
}, db: DbContext) {
  const [gate] = await db.select({ id: gates.id, terminalId: gates.terminalId })
    .from(gates)
    .where(and(eq(gates.id, params.gateId), eq(gates.orgId, params.orgId)))
    .limit(1)

  await db.update(gates)
    .set({ status: params.status, updatedAt: new Date() })
    .where(and(eq(gates.id, params.gateId), eq(gates.orgId, params.orgId)))

  if (gate) {
    await eventBus.emit('terminal.gate_status_updated', {
      type: 'terminal.gate_status_updated',
      gateId: params.gateId, orgId: params.orgId,
      terminalId: gate.terminalId, status: params.status,
      occurredAt: new Date(),
    })
  }
}

// ─── Berth ───

export async function createBerthCommand(params: {
  orgId: string
  terminalId: string
  code: string
  name: string
  lengthM: string
  maxDraftM: string
  maxVesselLoa?: string | undefined
}, db: DbContext) {
  const id = generateId()
  await db.insert(berths).values({
    id, orgId: params.orgId, terminalId: params.terminalId,
    code: params.code, name: params.name,
    lengthM: params.lengthM, maxDraftM: params.maxDraftM,
    maxVesselLoa: params.maxVesselLoa,
    createdAt: new Date(), updatedAt: new Date(),
  })

  await eventBus.emit('terminal.berth_created', {
    type: 'terminal.berth_created',
    berthId: id, orgId: params.orgId, terminalId: params.terminalId,
    code: params.code, name: params.name,
    occurredAt: new Date(),
  })

  return { id, code: params.code, name: params.name, terminalId: params.terminalId }
}

// ─── Crane ───

export async function createCraneCommand(params: {
  orgId: string
  terminalId: string
  code: string
  type: 'STS' | 'RTG' | 'RMG' | 'MOBILE' | 'FORKLIFT'
  capacityTonnes?: string | undefined
  maxOutreachM?: string | undefined
  assetId?: string | undefined
}, db: DbContext) {
  const id = generateId()
  await db.insert(cranes).values({
    id, orgId: params.orgId, terminalId: params.terminalId,
    code: params.code, type: params.type,
    capacityTonnes: params.capacityTonnes,
    maxOutreachM: params.maxOutreachM,
    assetId: params.assetId,
    createdAt: new Date(), updatedAt: new Date(),
  })

  await eventBus.emit('terminal.crane_created', {
    type: 'terminal.crane_created',
    craneId: id, orgId: params.orgId, terminalId: params.terminalId,
    code: params.code, craneType: params.type,
    occurredAt: new Date(),
  })

  return { id, code: params.code, type: params.type, terminalId: params.terminalId }
}
