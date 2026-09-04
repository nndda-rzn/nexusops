import { trains } from '@/shared/database/schema/rail'
import { eq, and } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { TrainNotFoundError } from '@/modules/rail/domain/errors/rail.errors'
import { Train } from '@/modules/rail/domain/entities/train.entity'
import type { TrainProps } from '@/modules/rail/domain/entities/train.entity'
import type { DbContext } from '@/shared/database/client'

type TrainRow = typeof trains.$inferSelect

function rowToTrain(row: TrainRow): Train {
  return Train.fromSnapshot({
    id: row.id, orgId: row.orgId, serviceId: row.serviceId,
    trainNumber: row.trainNumber,
    trainsetId: row.trainsetId ?? undefined,
    scheduledDeparture: row.scheduledDeparture,
    scheduledArrival: row.scheduledArrival,
    actualDeparture: row.actualDeparture ?? undefined,
    actualArrival: row.actualArrival ?? undefined,
    status: row.status,
    delayMinutes: row.delayMinutes,
    cancellationReason: row.cancellationReason ?? undefined,
    createdAt: row.createdAt, updatedAt: row.updatedAt,
  })
}

export async function findTrainById(id: string, orgId: string, db: DbContext): Promise<Train | null> {
  const [row] = await db.select().from(trains)
    .where(and(eq(trains.id, id), eq(trains.orgId, orgId))).limit(1)
  return row ? rowToTrain(row) : null
}

export async function findTrainByIdOrFail(id: string, orgId: string, db: DbContext): Promise<Train> {
  const train = await findTrainById(id, orgId, db)
  if (!train) throw new TrainNotFoundError(id)
  return train
}

export async function insertTrain(props: TrainProps, db: DbContext): Promise<void> {
  await db.insert(trains).values({
    id: props.id ?? generateId(),
    orgId: props.orgId, serviceId: props.serviceId,
    trainNumber: props.trainNumber, trainsetId: props.trainsetId,
    scheduledDeparture: props.scheduledDeparture, scheduledArrival: props.scheduledArrival,
    status: props.status, delayMinutes: props.delayMinutes,
    createdAt: props.createdAt, updatedAt: props.updatedAt,
  })
}

export async function saveTrain(train: Train, db: DbContext): Promise<void> {
  const snap = train.toSnapshot()
  await db.update(trains)
    .set({
      status: snap.status, trainsetId: snap.trainsetId,
      actualDeparture: snap.actualDeparture, actualArrival: snap.actualArrival,
      delayMinutes: snap.delayMinutes, cancellationReason: snap.cancellationReason,
      updatedAt: snap.updatedAt,
    })
    .where(and(eq(trains.id, snap.id), eq(trains.orgId, snap.orgId)))
}
