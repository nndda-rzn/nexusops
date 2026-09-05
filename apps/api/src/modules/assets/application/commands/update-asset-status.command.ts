import { findAssetByIdOrFail, saveAsset } from '@/modules/assets/infrastructure/repositories/asset.repository'
import { lifecycleEvents } from '@/shared/database/schema/assets'
import { generateId } from '@/shared/ids'
import type { AssetStatus } from '@/modules/assets/domain/entities/asset.entity'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export interface UpdateAssetStatusCommand {
  assetId: string
  orgId: string
  status: AssetStatus
  actorId: string
}

export async function updateAssetStatusCommand(
  cmd: UpdateAssetStatusCommand,
  db: DbContext
): Promise<void> {
  const asset = await findAssetByIdOrFail(cmd.assetId, cmd.orgId, db)
  const from = asset.status
  const now = new Date()
  asset.updateStatus(cmd.status)
  await saveAsset(asset, db)

  // P3R-04 FIX: persist lifecycle event for audit trail
  await db.insert(lifecycleEvents).values({
    id: generateId(), orgId: cmd.orgId, assetId: cmd.assetId,
    eventType: 'STATUS_CHANGED',
    description: `Status changed: ${from} → ${cmd.status}`,
    occurredAt: now, actorId: cmd.actorId,
  })

  await eventBus.emit('asset.status_changed', {
    type: 'asset.status_changed',
    assetId: cmd.assetId, orgId: cmd.orgId,
    from, to: cmd.status,
    occurredAt: now, actorId: cmd.actorId,
  })

  if (cmd.status === 'BREAKDOWN' || cmd.status === 'MAINTENANCE') {
    await eventBus.emit('asset.maintenance_required', {
      type: 'asset.maintenance_required',
      assetId: cmd.assetId, orgId: cmd.orgId,
      reason: `Status changed to ${cmd.status}`,
      occurredAt: now,
    })
  }
}
