import { findTrainByIdOrFail, saveTrain } from '@/modules/rail/infrastructure/repositories/train.repository'
import { crewAssignments } from '@/shared/database/schema/rail'
import { generateId } from '@/shared/ids'
import { DomainError } from '@/shared/errors'
import type { DbContext } from '@/shared/database/client'

export interface AssignCrewCommand {
  trainId: string
  orgId: string
  employeeId?: string | undefined
  role: 'DRIVER' | 'ASSISTANT' | 'CONDUCTOR'
  fromStationId: string
  toStationId: string
}

export async function assignCrewCommand(cmd: AssignCrewCommand, db: DbContext): Promise<{ id: string }> {
  const train = await findTrainByIdOrFail(cmd.trainId, cmd.orgId, db)

  // Q-07: only transition if TRAINSET_ASSIGNED — crew can also be added when already CREW_ASSIGNED
  // (multiple crew members per train). If status is anything else, throw a meaningful error.
  if (train.status === 'TRAINSET_ASSIGNED') {
    train.transition('CREW_ASSIGNED')
    await saveTrain(train, db)
  } else if (train.status !== 'CREW_ASSIGNED') {
    throw new DomainError(
      'invalid-train-status-for-crew',
      'Invalid Train Status',
      `Cannot assign crew to train in status '${train.status}'. Train must be TRAINSET_ASSIGNED or CREW_ASSIGNED.`,
      { train_id: cmd.trainId, status: train.status }
    )
  }

  const id = generateId()
  await db.insert(crewAssignments).values({
    id, orgId: cmd.orgId, trainId: cmd.trainId,
    employeeId: cmd.employeeId, role: cmd.role,
    fromStationId: cmd.fromStationId, toStationId: cmd.toStationId,
    createdAt: new Date(),
  })
  return { id }
}
