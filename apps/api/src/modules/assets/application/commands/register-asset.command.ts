import { insertAsset } from '@/modules/assets/infrastructure/repositories/asset.repository'
import { Asset } from '@/modules/assets/domain/entities/asset.entity'
import type { AssetCondition } from '@/modules/assets/domain/entities/asset.entity'
import { eventBus } from '@/shared/events'
import { generateId } from '@/shared/ids'
import type { DbContext } from '@/shared/database/client'

export interface RegisterAssetCommand {
  orgId: string
  assetNumber: string
  name: string
  ownerOrgId: string
  condition?: AssetCondition | undefined
  categoryId?: string | undefined
  serialNumber?: string | undefined
  manufacturer?: string | undefined
  model?: string | undefined
  yearManufactured?: number | undefined
  yearAcquired?: number | undefined
  acquisitionCost?: string | undefined
}

export async function registerAssetCommand(
  cmd: RegisterAssetCommand,
  db: DbContext
): Promise<{ id: string }> {
  const id = generateId()
  const now = new Date()

  const asset = Asset.fromSnapshot({
    id, orgId: cmd.orgId, assetNumber: cmd.assetNumber,
    name: cmd.name, ownerOrgId: cmd.ownerOrgId,
    categoryId: cmd.categoryId,
    serialNumber: cmd.serialNumber, manufacturer: cmd.manufacturer,
    model: cmd.model, yearManufactured: cmd.yearManufactured,
    yearAcquired: cmd.yearAcquired, acquisitionCost: cmd.acquisitionCost,
    status: 'ACTIVE', condition: cmd.condition ?? 'GOOD',
    createdAt: now, updatedAt: now,
  })

  await insertAsset(asset.toSnapshot(), db)

  await eventBus.emit('asset.registered', {
    type: 'asset.registered',
    assetId: id, orgId: cmd.orgId,
    assetNumber: cmd.assetNumber, name: cmd.name,
    occurredAt: now,
  })

  return { id }
}
