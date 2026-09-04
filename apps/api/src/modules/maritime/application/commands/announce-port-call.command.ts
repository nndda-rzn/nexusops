import { insertPortCall } from '@/modules/maritime/infrastructure/repositories/port-call.repository'
import { PortCall } from '@/modules/maritime/domain/entities/port-call.entity'
import { eventBus } from '@/shared/events'
import { generateId } from '@/shared/ids'
import { voyages } from '@/shared/database/schema/maritime'
import { eq, and } from 'drizzle-orm'
import { VoyageNotFoundError } from '@/modules/maritime/domain/errors/voyage-not-found.error'
import type { DbContext } from '@/shared/database/client'

export interface AnnouncePortCallCommand {
  orgId: string
  voyageId: string
  portId?: string | undefined
  eta?: Date | undefined
  etb?: Date | undefined
  etd?: Date | undefined
  agentId?: string | undefined
  notes?: string | undefined
}

export async function announcePortCallCommand(
  cmd: AnnouncePortCallCommand,
  db: DbContext
): Promise<{ id: string }> {
  // verify voyage belongs to org
  const [voyage] = await db.select({ id: voyages.id, vesselId: voyages.vesselId })
    .from(voyages)
    .where(and(eq(voyages.id, cmd.voyageId), eq(voyages.orgId, cmd.orgId)))
    .limit(1)
  if (!voyage) throw new VoyageNotFoundError(cmd.voyageId)

  const id = generateId()
  const now = new Date()

  const portCall = PortCall.fromSnapshot({
    id, orgId: cmd.orgId, voyageId: cmd.voyageId,
    portId: cmd.portId, eta: cmd.eta, etb: cmd.etb, etd: cmd.etd,
    agentId: cmd.agentId, notes: cmd.notes,
    status: 'ANNOUNCED', createdAt: now, updatedAt: now,
  })

  await insertPortCall(portCall.toSnapshot(), db)

  await eventBus.emit('port_call.announced', {
    type: 'port_call.announced',
    portCallId: id, orgId: cmd.orgId,
    voyageId: cmd.voyageId, vesselId: voyage.vesselId,
    portId: cmd.portId, eta: cmd.eta,
    occurredAt: now,
  })

  return { id }
}
