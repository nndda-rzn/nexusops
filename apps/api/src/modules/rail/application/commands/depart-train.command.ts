import { findTrainByIdOrFail, saveTrain } from '@/modules/rail/infrastructure/repositories/train.repository'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export interface DepartTrainCommand {
  trainId: string
  orgId: string
  actualDeparture?: Date | undefined
}

export async function departTrainCommand(cmd: DepartTrainCommand, db: DbContext): Promise<void> {
  const train = await findTrainByIdOrFail(cmd.trainId, cmd.orgId, db)
  const actualDeparture = cmd.actualDeparture ?? new Date()
  train.recordDeparture(actualDeparture)
  train.transition('EN_ROUTE')
  await saveTrain(train, db)

  await eventBus.emit('train.departed', {
    type: 'train.departed',
    trainId: cmd.trainId, orgId: cmd.orgId,
    trainNumber: train.trainNumber,
    actualDeparture, occurredAt: new Date(),
  })
}
