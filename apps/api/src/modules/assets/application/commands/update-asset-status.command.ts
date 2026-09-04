import { findAssetByIdOrFail, saveAsset } from '@/modules/assets/infrastructure/repositories/asset.repository'
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
  asset.updateStatus(cmd.status)
  await saveAsset(asset, db)

  await eventBus.emit('asset.status_changed', {
    type: 'asset.status_changed',
    assetId: cmd.assetId, orgId: cmd.orgId,
    from, to: cmd.status,
    occurredAt: new Date(), actorId: cmd.actorId,
  })

  if (cmd.status === 'BREAKDOWN' || cmd.status === 'MAINTENANCE') {
    await eventBus.emit('asset.maintenance_required', {
      type: 'asset.maintenance_required',
      assetId: cmd.assetId, orgId: cmd.orgId,
      reason: `Status changed to ${cmd.status}`,
      occurredAt: new Date(),
    })
  }
}
