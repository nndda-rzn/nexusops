import { trainsets } from '@/shared/database/schema/rail'
import { generateId } from '@/shared/ids'
import type { DbContext } from '@/shared/database/client'

export interface CreateTrainsetCommand {
  orgId: string
  trainsetNumber: string
  locomotiveId?: string | undefined
  capacityTeu?: number | undefined
  capacityWeight?: string | undefined
}

export async function createTrainsetCommand(
  cmd: CreateTrainsetCommand,
  db: DbContext
): Promise<{ id: string }> {
  const id = generateId()
  const now = new Date()
  await db.insert(trainsets).values({
    id, orgId: cmd.orgId, trainsetNumber: cmd.trainsetNumber,
    locomotiveId: cmd.locomotiveId,
    capacityTeu: cmd.capacityTeu,
    capacityWeight: cmd.capacityWeight,
    status: 'AVAILABLE',
    createdAt: now, updatedAt: now,
  })
  return { id }
}
