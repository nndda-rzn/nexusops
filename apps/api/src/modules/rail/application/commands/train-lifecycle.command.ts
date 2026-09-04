import { findTrainByIdOrFail, saveTrain } from '@/modules/rail/infrastructure/repositories/train.repository'
import type { DbContext } from '@/shared/database/client'

export interface StartLoadingCommand {
  trainId: string
  orgId: string
}

export interface CompleteTrainCommand {
  trainId: string
  orgId: string
}

export async function startLoadingCommand(cmd: StartLoadingCommand, db: DbContext): Promise<void> {
  const train = await findTrainByIdOrFail(cmd.trainId, cmd.orgId, db)
  train.transition('LOADING')
  await saveTrain(train, db)
}

export async function completeTrainCommand(cmd: CompleteTrainCommand, db: DbContext): Promise<void> {
  const train = await findTrainByIdOrFail(cmd.trainId, cmd.orgId, db)
  train.transition('COMPLETED')
  await saveTrain(train, db)
}
