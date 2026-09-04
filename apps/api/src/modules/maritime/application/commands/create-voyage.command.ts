import { insertVoyage } from '@/modules/maritime/infrastructure/repositories/voyage.repository'
import { Voyage } from '@/modules/maritime/domain/entities/voyage.entity'
import { generateId } from '@/shared/ids'
import type { DbContext } from '@/shared/database/client'

export interface CreateVoyageCommand {
  orgId: string
  voyageNumber: string
  vesselId: string
  serviceName?: string | undefined
  departurePortId?: string | undefined
  destinationPortId?: string | undefined
}

export async function createVoyageCommand(
  cmd: CreateVoyageCommand,
  db: DbContext
): Promise<{ id: string }> {
  const id = generateId()
  const now = new Date()

  const voyage = Voyage.fromSnapshot({
    id, orgId: cmd.orgId, voyageNumber: cmd.voyageNumber,
    vesselId: cmd.vesselId, serviceName: cmd.serviceName,
    departurePortId: cmd.departurePortId,
    destinationPortId: cmd.destinationPortId,
    status: 'PLANNED', createdAt: now, updatedAt: now,
  })

  await insertVoyage(voyage.toSnapshot(), db)

  return { id }
}
