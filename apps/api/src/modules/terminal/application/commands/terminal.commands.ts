import { terminals, gates } from '@/shared/database/schema/terminal'
import { eq, and } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
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
  await db.update(gates)
    .set({ status: params.status, updatedAt: new Date() })
    .where(and(eq(gates.id, params.gateId), eq(gates.orgId, params.orgId)))
}
