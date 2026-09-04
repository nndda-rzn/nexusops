import { findPortCallByIdOrFail, savePortCall } from '@/modules/maritime/infrastructure/repositories/port-call.repository'
import type { DbContext } from '@/shared/database/client'

export interface CompleteOperationsCommand {
  portCallId: string
  orgId: string
}

export async function completeOperationsCommand(cmd: CompleteOperationsCommand, db: DbContext): Promise<void> {
  const portCall = await findPortCallByIdOrFail(cmd.portCallId, cmd.orgId, db)
  portCall.transition('OPERATIONS_COMPLETED')
  await savePortCall(portCall, db)
}
