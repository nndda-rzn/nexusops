import { insertTrain } from '@/modules/rail/infrastructure/repositories/train.repository'
import { Train } from '@/modules/rail/domain/entities/train.entity'
import { eventBus } from '@/shared/events'
import { generateId } from '@/shared/ids'
import type { DbContext } from '@/shared/database/client'

export interface ScheduleTrainCommand {
  orgId: string
  serviceId: string
  trainNumber: string
  scheduledDeparture: Date
  scheduledArrival: Date
}

export async function scheduleTrainCommand(
  cmd: ScheduleTrainCommand,
  db: DbContext
): Promise<{ id: string }> {
  const id = generateId()
  const now = new Date()

  const train = Train.fromSnapshot({
    id, orgId: cmd.orgId, serviceId: cmd.serviceId,
    trainNumber: cmd.trainNumber,
    scheduledDeparture: cmd.scheduledDeparture,
    scheduledArrival: cmd.scheduledArrival,
    status: 'SCHEDULED', delayMinutes: 0,
    createdAt: now, updatedAt: now,
  })

  await insertTrain(train.toSnapshot(), db)

  await eventBus.emit('train.scheduled', {
    type: 'train.scheduled',
    trainId: id, orgId: cmd.orgId,
    trainNumber: cmd.trainNumber, serviceId: cmd.serviceId,
    scheduledDeparture: cmd.scheduledDeparture,
    scheduledArrival: cmd.scheduledArrival,
    occurredAt: now,
  })

  return { id }
}
