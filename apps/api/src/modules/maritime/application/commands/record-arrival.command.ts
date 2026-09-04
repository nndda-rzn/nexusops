import { findPortCallByIdOrFail, savePortCall } from '@/modules/maritime/infrastructure/repositories/port-call.repository'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export interface RecordArrivalCommand {
  portCallId: string
  orgId: string
  ata: Date
}

export async function recordArrivalCommand(cmd: RecordArrivalCommand, db: DbContext): Promise<void> {
  const portCall = await findPortCallByIdOrFail(cmd.portCallId, cmd.orgId, db)
  portCall.recordAta(cmd.ata)
  portCall.transition('ARRIVED_ANCHORAGE')
  await savePortCall(portCall, db)

  await eventBus.emit('vessel.arrived', {
    type: 'vessel.arrived',
    vesselId: '', orgId: cmd.orgId,
    portCallId: cmd.portCallId, ata: cmd.ata,
    occurredAt: new Date(),
  })
}
