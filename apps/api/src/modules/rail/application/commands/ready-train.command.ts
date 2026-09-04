import { findTrainByIdOrFail, saveTrain } from '@/modules/rail/infrastructure/repositories/train.repository'
import type { DbContext } from '@/shared/database/client'

export interface ReadyTrainCommand {
  trainId: string
  orgId: string
}

export async function readyTrainCommand(
  cmd: ReadyTrainCommand,
  db: DbContext
): Promise<void> {
  const train = await findTrainByIdOrFail(cmd.trainId, cmd.orgId, db)
  train.transition('READY_TO_DEPART')
  await saveTrain(train, db)
}
