import { findPortCallByIdOrFail, savePortCall } from '@/modules/maritime/infrastructure/repositories/port-call.repository'
import type { DbContext } from '@/shared/database/client'

export interface RequestPilotageCommand {
  portCallId: string
  orgId: string
}

export async function requestPilotageCommand(cmd: RequestPilotageCommand, db: DbContext): Promise<void> {
  const portCall = await findPortCallByIdOrFail(cmd.portCallId, cmd.orgId, db)
  portCall.transition('PILOTAGE_REQUESTED')
  await savePortCall(portCall, db)
}
