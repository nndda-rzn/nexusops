import { findTrainByIdOrFail, saveTrain } from '@/modules/rail/infrastructure/repositories/train.repository'
import { crewAssignments } from '@/shared/database/schema/rail'
import { generateId } from '@/shared/ids'
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
  if (train.status === 'TRAINSET_ASSIGNED') {
    train.transition('CREW_ASSIGNED')
    await saveTrain(train, db)
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
