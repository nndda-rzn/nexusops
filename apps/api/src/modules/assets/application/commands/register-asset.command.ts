import { insertAsset } from '@/modules/assets/infrastructure/repositories/asset.repository'
import { Asset } from '@/modules/assets/domain/entities/asset.entity'
import type { AssetCondition } from '@/modules/assets/domain/entities/asset.entity'
import { categories } from '@/shared/database/schema/assets'
import { eq, and } from 'drizzle-orm'
import { eventBus } from '@/shared/events'
import { generateId } from '@/shared/ids'
import { AssetCategoryNotFoundError } from '@/modules/assets/domain/errors/assets.errors'
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

  // P3R-06 FIX: validate referenced category belongs to the org
  if (cmd.categoryId) {
    const [cat] = await db.select({ id: categories.id }).from(categories)
      .where(and(eq(categories.id, cmd.categoryId), eq(categories.orgId, cmd.orgId)))
      .limit(1)
    if (!cat) throw new AssetCategoryNotFoundError(cmd.categoryId)
  }

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
