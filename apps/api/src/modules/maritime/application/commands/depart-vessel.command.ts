import { findPortCallByIdOrFail, savePortCall } from '@/modules/maritime/infrastructure/repositories/port-call.repository'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export interface DepartVesselCommand {
  portCallId: string
  orgId: string
  atd: Date
}

export async function departVesselCommand(cmd: DepartVesselCommand, db: DbContext): Promise<void> {
  const portCall = await findPortCallByIdOrFail(cmd.portCallId, cmd.orgId, db)
  portCall.transition('UNBERTHING')
  portCall.transition('DEPARTED')
  portCall.recordAtd(cmd.atd)
  await savePortCall(portCall, db)

  await eventBus.emit('vessel.departed', {
    type: 'vessel.departed',
    vesselId: '', orgId: cmd.orgId,
    portCallId: cmd.portCallId, atd: cmd.atd,
    occurredAt: new Date(),
  })
}
