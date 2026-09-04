import { findTrainByIdOrFail, saveTrain } from '@/modules/rail/infrastructure/repositories/train.repository'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export interface RecordTrainArrivalCommand {
  trainId: string
  orgId: string
  actualArrival?: Date | undefined
}

export async function recordTrainArrivalCommand(cmd: RecordTrainArrivalCommand, db: DbContext): Promise<void> {
  const train = await findTrainByIdOrFail(cmd.trainId, cmd.orgId, db)
  const actualArrival = cmd.actualArrival ?? new Date()
  train.recordArrival(actualArrival)
  train.transition('ARRIVED')
  await saveTrain(train, db)

  await eventBus.emit('train.arrived', {
    type: 'train.arrived',
    trainId: cmd.trainId, orgId: cmd.orgId,
    trainNumber: train.trainNumber,
    actualArrival, occurredAt: new Date(),
  })
}
