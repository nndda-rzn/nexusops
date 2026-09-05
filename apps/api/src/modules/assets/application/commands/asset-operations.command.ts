import { findAssetByIdOrFail, saveAsset } from '@/modules/assets/infrastructure/repositories/asset.repository'
import { operatorAssignments, inspections, lifecycleEvents } from '@/shared/database/schema/assets'
import { eq, and } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { eventBus } from '@/shared/events'
import { DomainError } from '@/shared/errors'
import type { DbContext } from '@/shared/database/client'

async function recordLifecycleEvent(
  orgId: string, assetId: string, eventType: string, description: string, actorId: string, db: DbContext
): Promise<void> {
  await db.insert(lifecycleEvents).values({
    id: generateId(), orgId, assetId,
    eventType, description, occurredAt: new Date(), actorId,
  })
}

// ─── Operator Assignment ───

export interface AssignAssetOperatorCommand {
  assetId: string
  orgId: string
  operatorOrgId: string
  assignmentStart: Date
  assignmentEnd?: Date | undefined
  internalRate?: string | undefined
  rateUnit?: 'PER_MOVE' | 'PER_HOUR' | 'PER_KM' | 'PER_DAY' | undefined
  approvedBy: string
}

export async function assignAssetOperatorCommand(
  cmd: AssignAssetOperatorCommand,
  db: DbContext
): Promise<{ id: string }> {
  const asset = await findAssetByIdOrFail(cmd.assetId, cmd.orgId, db)
  if (asset.status === 'ASSIGNED_OUT') {
    throw new DomainError('asset-already-assigned', 'Asset Already Assigned',
      `Asset '${cmd.assetId}' is already assigned to an operator.`, { asset_id: cmd.assetId })
  }

  const id = generateId()
  const now = new Date()
  await db.insert(operatorAssignments).values({
    id, assetId: cmd.assetId,
    ownerOrgId: cmd.orgId, operatorOrgId: cmd.operatorOrgId,
    assignmentStart: cmd.assignmentStart, assignmentEnd: cmd.assignmentEnd,
    internalRate: cmd.internalRate, rateUnit: cmd.rateUnit,
    status: 'ACTIVE', approvedBy: cmd.approvedBy,
    createdAt: now,
  })

  asset.assignOperator(cmd.operatorOrgId)
  await saveAsset(asset, db)
  await recordLifecycleEvent(cmd.orgId, cmd.assetId, 'OPERATOR_ASSIGNED',
    `Assigned to operator '${cmd.operatorOrgId}'`, cmd.approvedBy, db)

  await eventBus.emit('asset.operator_assigned', {
    type: 'asset.operator_assigned',
    assetId: cmd.assetId, ownerOrgId: cmd.orgId,
    operatorOrgId: cmd.operatorOrgId, assignmentId: id,
    occurredAt: now, approvedBy: cmd.approvedBy,
  })

  return { id }
}

export async function returnAssetOperatorCommand(
  cmd: { assetId: string; orgId: string; assignmentId: string; actorId: string },
  db: DbContext
): Promise<void> {
  const asset = await findAssetByIdOrFail(cmd.assetId, cmd.orgId, db)
  const prevOperator = asset.operatorOrgId
  // P3R-04 FIX: guard — no empty-string fallback on event payload
  if (!prevOperator) {
    throw new DomainError('asset-not-assigned', 'Asset Not Assigned',
      `Asset '${cmd.assetId}' has no operator to return.`, { asset_id: cmd.assetId })
  }
  const now = new Date()

  await db.update(operatorAssignments)
    .set({ status: 'COMPLETED', assignmentEnd: now })
    .where(and(
      eq(operatorAssignments.id, cmd.assignmentId),
      eq(operatorAssignments.assetId, cmd.assetId),
    ))

  asset.returnOperator()
  await saveAsset(asset, db)
  await recordLifecycleEvent(cmd.orgId, cmd.assetId, 'OPERATOR_RETURNED',
    `Returned from operator '${prevOperator}'`, cmd.actorId, db)

  await eventBus.emit('asset.operator_returned', {
    type: 'asset.operator_returned',
    assetId: cmd.assetId, ownerOrgId: cmd.orgId,
    operatorOrgId: prevOperator,
    assignmentId: cmd.assignmentId,
    occurredAt: now,
  })
}

// ─── Inspection ───

export interface RecordInspectionCommand {
  assetId: string
  orgId: string
  inspectionType: 'ROUTINE' | 'PRE_OPERATION' | 'POST_OPERATION' | 'ANNUAL' | 'SPECIAL'
  result: 'PASS' | 'FAIL' | 'CONDITIONAL'
  findings?: string | undefined
  inspectedAt: Date
  inspectorId?: string | undefined
  nextInspectionDate?: string | undefined
}

export async function recordInspectionCommand(
  cmd: RecordInspectionCommand,
  db: DbContext
): Promise<{ id: string }> {
  const id = generateId()
  await db.insert(inspections).values({
    id, orgId: cmd.orgId, assetId: cmd.assetId,
    inspectionType: cmd.inspectionType, result: cmd.result,
    findings: cmd.findings, inspectedAt: cmd.inspectedAt,
    inspectorId: cmd.inspectorId,
    nextInspectionDate: cmd.nextInspectionDate,
    createdAt: new Date(),
  })
  await recordLifecycleEvent(cmd.orgId, cmd.assetId, 'INSPECTION_COMPLETED',
    `Inspection ${cmd.inspectionType}: ${cmd.result}`, cmd.inspectorId ?? cmd.orgId, db)

  await eventBus.emit('asset.inspection_completed', {
    type: 'asset.inspection_completed',
    assetId: cmd.assetId, orgId: cmd.orgId,
    inspectionId: id, result: cmd.result,
    occurredAt: new Date(),
  })

  if (cmd.result === 'FAIL') {
    await eventBus.emit('asset.maintenance_required', {
      type: 'asset.maintenance_required',
      assetId: cmd.assetId, orgId: cmd.orgId,
      reason: `Inspection failed: ${cmd.findings ?? 'No findings provided'}`,
      occurredAt: new Date(),
    })
  }

  return { id }
}
