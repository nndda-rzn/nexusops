import { findTrainByIdOrFail, saveTrain } from '@/modules/rail/infrastructure/repositories/train.repository'
import type { DbContext } from '@/shared/database/client'

export async function startLoadingCommand(
  cmd: { trainId: string; orgId: string },
  db: DbContext
): Promise<void> {
  const train = await findTrainByIdOrFail(cmd.trainId, cmd.orgId, db)
  train.transition('LOADING')
  await saveTrain(train, db)
}

export async function completeTrainCommand(
  cmd: { trainId: string; orgId: string },
  db: DbContext
): Promise<void> {
  const train = await findTrainByIdOrFail(cmd.trainId, cmd.orgId, db)
  train.transition('COMPLETED')
  await saveTrain(train, db)
}
