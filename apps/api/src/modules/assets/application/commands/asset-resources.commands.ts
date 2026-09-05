import { categories, assetLocations } from '@/shared/database/schema/assets'
import { generateId } from '@/shared/ids'
import type { DbContext } from '@/shared/database/client'

// ─── Asset Category ───

export interface CreateAssetCategoryCommand {
  orgId: string
  code: string
  name: string
  parentCategoryId?: string | undefined
  maintenanceIntervalDays?: number | undefined
  inspectionRequired?: boolean | undefined
}

export async function createAssetCategoryCommand(
  cmd: CreateAssetCategoryCommand,
  db: DbContext
): Promise<{ id: string }> {
  const id = generateId()
  await db.insert(categories).values({
    id, orgId: cmd.orgId, code: cmd.code, name: cmd.name,
    parentCategoryId: cmd.parentCategoryId,
    maintenanceIntervalDays: cmd.maintenanceIntervalDays,
    inspectionRequired: cmd.inspectionRequired ?? false,
    createdAt: new Date(),
  })
  return { id }
}

// ─── Asset Location ───

export interface UpdateAssetLocationCommand {
  assetId: string
  locationType: 'TERMINAL' | 'YARD' | 'WAREHOUSE' | 'WORKSHOP' | 'RAIL_DEPOT' | 'AIRPORT' | 'EXTERNAL'
  locationId?: string | undefined
  position?: string | undefined  // WKT
}

export async function updateAssetLocationCommand(
  cmd: UpdateAssetLocationCommand,
  db: DbContext
): Promise<void> {
  await db.insert(assetLocations).values({
    id: generateId(), assetId: cmd.assetId,
    locationType: cmd.locationType,
    locationId: cmd.locationId,
    position: cmd.position,
    recordedAt: new Date(),
  })
}
