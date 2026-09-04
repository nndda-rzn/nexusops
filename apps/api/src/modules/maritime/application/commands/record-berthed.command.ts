import { findPortCallByIdOrFail, savePortCall } from '@/modules/maritime/infrastructure/repositories/port-call.repository'
import { voyages } from '@/shared/database/schema/maritime'
import { eq } from 'drizzle-orm'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export interface RecordBerthedCommand {
  portCallId: string
  orgId: string
  atb: Date
  berthId?: string | undefined
}

export async function recordBerthedCommand(cmd: RecordBerthedCommand, db: DbContext): Promise<void> {
  const portCall = await findPortCallByIdOrFail(cmd.portCallId, cmd.orgId, db)
  portCall.recordAtb(cmd.atb)
  portCall.transition('BERTHED')
  await savePortCall(portCall, db)

  // Lookup vesselId via voyage
  const [voyage] = await db.select({ vesselId: voyages.vesselId })
    .from(voyages)
    .where(eq(voyages.id, portCall.voyageId))
    .limit(1)

  await eventBus.emit('vessel.berthed', {
    type: 'vessel.berthed',
    vesselId: voyage?.vesselId ?? '',
    orgId: cmd.orgId,
    portCallId: cmd.portCallId, berthId: cmd.berthId,
    atb: cmd.atb, occurredAt: new Date(),
  })
}
