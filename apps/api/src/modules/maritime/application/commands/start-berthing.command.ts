import { findPortCallByIdOrFail, savePortCall } from '@/modules/maritime/infrastructure/repositories/port-call.repository'
import type { DbContext } from '@/shared/database/client'

export interface StartBerthingCommand {
  portCallId: string
  orgId: string
}

export async function startBerthingCommand(cmd: StartBerthingCommand, db: DbContext): Promise<void> {
  const portCall = await findPortCallByIdOrFail(cmd.portCallId, cmd.orgId, db)
  portCall.transition('BERTHING')
  await savePortCall(portCall, db)
}
