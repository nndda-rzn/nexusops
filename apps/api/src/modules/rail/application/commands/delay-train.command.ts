import { findTrainByIdOrFail, saveTrain } from '@/modules/rail/infrastructure/repositories/train.repository'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export interface DelayTrainCommand {
  trainId: string
  orgId: string
  delayMinutes: number
  reason?: string | undefined
}

export async function delayTrainCommand(cmd: DelayTrainCommand, db: DbContext): Promise<void> {
  const train = await findTrainByIdOrFail(cmd.trainId, cmd.orgId, db)
  train.delay(cmd.delayMinutes, cmd.reason)
  if (train.status === 'EN_ROUTE') train.transition('DELAYED')
  await saveTrain(train, db)

  await eventBus.emit('train.delayed', {
    type: 'train.delayed',
    trainId: cmd.trainId, orgId: cmd.orgId,
    trainNumber: train.trainNumber,
    delayMinutes: cmd.delayMinutes,
    totalDelayMinutes: train.delayMinutes,
    occurredAt: new Date(),
  })
}
