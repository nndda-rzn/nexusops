import { findTrainByIdOrFail, saveTrain } from '@/modules/rail/infrastructure/repositories/train.repository'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export interface CancelTrainCommand {
  trainId: string
  orgId: string
  reason: string
}

export async function cancelTrainCommand(cmd: CancelTrainCommand, db: DbContext): Promise<void> {
  const train = await findTrainByIdOrFail(cmd.trainId, cmd.orgId, db)
  train.cancel(cmd.reason)
  await saveTrain(train, db)

  await eventBus.emit('train.cancelled', {
    type: 'train.cancelled',
    trainId: cmd.trainId, orgId: cmd.orgId,
    trainNumber: train.trainNumber,
    reason: cmd.reason, occurredAt: new Date(),
  })
}
