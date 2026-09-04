import { findTrainByIdOrFail, saveTrain } from '@/modules/rail/infrastructure/repositories/train.repository'
import type { DbContext } from '@/shared/database/client'

export async function assignTrainsetCommand(
  cmd: { trainId: string; orgId: string; trainsetId: string },
  db: DbContext
): Promise<void> {
  const train = await findTrainByIdOrFail(cmd.trainId, cmd.orgId, db)
  train.assignTrainset(cmd.trainsetId)
  train.transition('TRAINSET_ASSIGNED')
  await saveTrain(train, db)
}
