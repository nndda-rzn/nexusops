import { findPortCallByIdOrFail, savePortCall } from '@/modules/maritime/infrastructure/repositories/port-call.repository'
import type { DbContext } from '@/shared/database/client'

export interface StartOperationsCommand {
  portCallId: string
  orgId: string
}

export async function startOperationsCommand(cmd: StartOperationsCommand, db: DbContext): Promise<void> {
  const portCall = await findPortCallByIdOrFail(cmd.portCallId, cmd.orgId, db)
  portCall.transition('OPERATIONS')
  await savePortCall(portCall, db)
}
