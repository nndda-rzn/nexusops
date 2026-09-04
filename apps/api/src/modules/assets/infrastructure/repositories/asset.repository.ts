import { assets } from '@/shared/database/schema/assets'
import { eq, and } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { AssetNotFoundError } from '@/modules/assets/domain/errors/assets.errors'
import { Asset } from '@/modules/assets/domain/entities/asset.entity'
import type { AssetProps } from '@/modules/assets/domain/entities/asset.entity'
import type { DbContext } from '@/shared/database/client'

type AssetRow = typeof assets.$inferSelect

function rowToAsset(row: AssetRow): Asset {
  return Asset.fromSnapshot({
    id: row.id, orgId: row.orgId,
    assetNumber: row.assetNumber,
    categoryId: row.categoryId ?? undefined,
    name: row.name,
    serialNumber: row.serialNumber ?? undefined,
    manufacturer: row.manufacturer ?? undefined,
    model: row.model ?? undefined,
    yearManufactured: row.yearManufactured ?? undefined,
    yearAcquired: row.yearAcquired ?? undefined,
    acquisitionCost: row.acquisitionCost ?? undefined,
    currentValue: row.currentValue ?? undefined,
    ownerOrgId: row.ownerOrgId,
    operatorOrgId: row.operatorOrgId ?? undefined,
    status: row.status, condition: row.condition,
    createdAt: row.createdAt, updatedAt: row.updatedAt,
  })
}

export async function findAssetById(id: string, orgId: string, db: DbContext): Promise<Asset | null> {
  const [row] = await db.select().from(assets)
    .where(and(eq(assets.id, id), eq(assets.orgId, orgId))).limit(1)
  return row ? rowToAsset(row) : null
}

export async function findAssetByIdOrFail(id: string, orgId: string, db: DbContext): Promise<Asset> {
  const asset = await findAssetById(id, orgId, db)
  if (!asset) throw new AssetNotFoundError(id)
  return asset
}

export async function insertAsset(props: AssetProps, db: DbContext): Promise<void> {
  await db.insert(assets).values({
    id: props.id ?? generateId(),
    orgId: props.orgId, assetNumber: props.assetNumber,
    categoryId: props.categoryId, name: props.name,
    serialNumber: props.serialNumber, manufacturer: props.manufacturer,
    model: props.model, yearManufactured: props.yearManufactured,
    yearAcquired: props.yearAcquired,
    acquisitionCost: props.acquisitionCost, currentValue: props.currentValue,
    ownerOrgId: props.ownerOrgId, operatorOrgId: props.operatorOrgId,
    status: props.status, condition: props.condition,
    createdAt: props.createdAt, updatedAt: props.updatedAt,
  })
}

export async function saveAsset(asset: Asset, db: DbContext): Promise<void> {
  const snap = asset.toSnapshot()
  await db.update(assets)
    .set({ status: snap.status, operatorOrgId: snap.operatorOrgId, updatedAt: snap.updatedAt })
    .where(and(eq(assets.id, snap.id), eq(assets.orgId, snap.orgId)))
}
