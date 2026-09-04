import { findAssetByIdOrFail, saveAsset } from '@/modules/assets/infrastructure/repositories/asset.repository'
import { operatorAssignments, inspections, categories, assetLocations } from '@/shared/database/schema/assets'
import { eq, and } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { eventBus } from '@/shared/events'
import { DomainError } from '@/shared/errors'
import type { DbContext } from '@/shared/database/client'

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
  await db.insert(operatorAssignments).values({
    id, assetId: cmd.assetId,
    ownerOrgId: cmd.orgId, operatorOrgId: cmd.operatorOrgId,
    assignmentStart: cmd.assignmentStart, assignmentEnd: cmd.assignmentEnd,
    internalRate: cmd.internalRate, rateUnit: cmd.rateUnit,
    status: 'ACTIVE', approvedBy: cmd.approvedBy,
    createdAt: new Date(),
  })

  asset.assignOperator(cmd.operatorOrgId)
  await saveAsset(asset, db)

  await eventBus.emit('asset.operator_assigned', {
    type: 'asset.operator_assigned',
    assetId: cmd.assetId, ownerOrgId: cmd.orgId,
    operatorOrgId: cmd.operatorOrgId, assignmentId: id,
    occurredAt: new Date(), approvedBy: cmd.approvedBy,
  })

  return { id }
}

export async function returnAssetOperatorCommand(
  cmd: { assetId: string; orgId: string; assignmentId: string },
  db: DbContext
): Promise<void> {
  const asset = await findAssetByIdOrFail(cmd.assetId, cmd.orgId, db)
  const now = new Date()

  await db.update(operatorAssignments)
    .set({ status: 'COMPLETED', assignmentEnd: now })
    .where(and(
      eq(operatorAssignments.id, cmd.assignmentId),
      eq(operatorAssignments.assetId, cmd.assetId),
    ))

  const prevOperator = asset.operatorOrgId
  asset.returnOperator()
  await saveAsset(asset, db)

  await eventBus.emit('asset.operator_returned', {
    type: 'asset.operator_returned',
    assetId: cmd.assetId, ownerOrgId: cmd.orgId,
    operatorOrgId: prevOperator ?? '',
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
