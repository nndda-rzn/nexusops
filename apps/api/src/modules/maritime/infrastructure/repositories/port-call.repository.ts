import { portCalls } from '@/shared/database/schema/maritime'
import { eq, and } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { PortCallNotFoundError } from '@/modules/maritime/domain/errors/port-call-not-found.error'
import { PortCall } from '@/modules/maritime/domain/entities/port-call.entity'
import type { PortCallProps, PortCallStatus } from '@/modules/maritime/domain/entities/port-call.entity'
import type { DbContext } from '@/shared/database/client'

type PortCallRow = typeof portCalls.$inferSelect

function rowToPortCall(row: PortCallRow): PortCall {
  return PortCall.fromSnapshot({
    id: row.id,
    orgId: row.orgId,
    voyageId: row.voyageId,
    portId: row.portId ?? undefined,
    eta: row.eta ?? undefined,
    etb: row.etb ?? undefined,
    etd: row.etd ?? undefined,
    ata: row.ata ?? undefined,
    atb: row.atb ?? undefined,
    atd: row.atd ?? undefined,
    status: row.status as PortCallStatus,
    agentId: row.agentId ?? undefined,
    delayReason: row.delayReason ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  })
}

export async function findPortCallById(id: string, orgId: string, db: DbContext): Promise<PortCall | null> {
  const [row] = await db.select().from(portCalls)
    .where(and(eq(portCalls.id, id), eq(portCalls.orgId, orgId)))
    .limit(1)
  return row ? rowToPortCall(row) : null
}

export async function findPortCallByIdOrFail(id: string, orgId: string, db: DbContext): Promise<PortCall> {
  const pc = await findPortCallById(id, orgId, db)
  if (!pc) throw new PortCallNotFoundError(id)
  return pc
}

export async function insertPortCall(props: PortCallProps, db: DbContext): Promise<void> {
  await db.insert(portCalls).values({
    id: props.id ?? generateId(),
    orgId: props.orgId,
    voyageId: props.voyageId,
    portId: props.portId,
    eta: props.eta,
    etb: props.etb,
    etd: props.etd,
    status: props.status,
    agentId: props.agentId,
    notes: props.notes,
    createdAt: props.createdAt,
    updatedAt: props.updatedAt,
  })
}

export async function savePortCall(portCall: PortCall, db: DbContext): Promise<void> {
  const snap = portCall.toSnapshot()
  await db.update(portCalls)
    .set({
      status: snap.status,
      eta: snap.eta,
      etb: snap.etb,
      etd: snap.etd,
      ata: snap.ata,
      atb: snap.atb,
      atd: snap.atd,
      agentId: snap.agentId,
      delayReason: snap.delayReason,
      notes: snap.notes,
      updatedAt: snap.updatedAt,
    })
    .where(and(eq(portCalls.id, snap.id), eq(portCalls.orgId, snap.orgId)))
}
