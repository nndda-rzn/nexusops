import { findPortCallByIdOrFail, savePortCall } from '@/modules/maritime/infrastructure/repositories/port-call.repository'
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

  await eventBus.emit('vessel.berthed', {
    type: 'vessel.berthed',
    vesselId: '', orgId: cmd.orgId,
    portCallId: cmd.portCallId, berthId: cmd.berthId,
    atb: cmd.atb, occurredAt: new Date(),
  })
}
