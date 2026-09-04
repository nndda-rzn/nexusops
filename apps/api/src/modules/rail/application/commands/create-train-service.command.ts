import { trainServices } from '@/shared/database/schema/rail'
import { generateId } from '@/shared/ids'
import type { DbContext } from '@/shared/database/client'

export interface CreateTrainServiceCommand {
  orgId: string
  serviceCode: string
  originStationId: string
  destinationStationId: string
  frequency: 'DAILY' | 'WEEKLY' | 'CUSTOM'
  commodityType?: string | undefined
  operator?: string | undefined
}

export async function createTrainServiceCommand(
  cmd: CreateTrainServiceCommand,
  db: DbContext
): Promise<{ id: string }> {
  const id = generateId()
  const now = new Date()
  await db.insert(trainServices).values({
    id, orgId: cmd.orgId, serviceCode: cmd.serviceCode,
    originStationId: cmd.originStationId,
    destinationStationId: cmd.destinationStationId,
    frequency: cmd.frequency,
    commodityType: cmd.commodityType,
    operator: cmd.operator,
    createdAt: now, updatedAt: now,
  })
  return { id }
}
