import { findPortCallByIdOrFail, savePortCall } from '@/modules/maritime/infrastructure/repositories/port-call.repository'
import type { DbContext } from '@/shared/database/client'

export async function startBerthingCommand(
  cmd: { portCallId: string; orgId: string },
  db: DbContext
): Promise<void> {
  const portCall = await findPortCallByIdOrFail(cmd.portCallId, cmd.orgId, db)
  portCall.transition('BERTHING')
  await savePortCall(portCall, db)
}
