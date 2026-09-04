import { findPortCallByIdOrFail, savePortCall } from '@/modules/maritime/infrastructure/repositories/port-call.repository'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export interface ConfirmEtaCommand {
  portCallId: string
  orgId: string
  eta: Date
  actorId: string
}

export async function confirmEtaCommand(cmd: ConfirmEtaCommand, db: DbContext): Promise<void> {
  const portCall = await findPortCallByIdOrFail(cmd.portCallId, cmd.orgId, db)
  portCall.updateEta(cmd.eta)
  portCall.transition('ETA_CONFIRMED')
  await savePortCall(portCall, db)

  await eventBus.emit('vessel.eta_changed', {
    type: 'vessel.eta_changed',
    vesselId: '',  // resolved by subscriber via voyageId if needed
    orgId: cmd.orgId, portCallId: cmd.portCallId,
    eta: cmd.eta, occurredAt: new Date(), actorId: cmd.actorId,
  })
}
