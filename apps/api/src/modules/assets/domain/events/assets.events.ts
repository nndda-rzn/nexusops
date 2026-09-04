import type { AssetStatus } from '../entities/asset.entity'

export interface AssetRegisteredEvent {
  type: 'asset.registered'
  assetId: string
  orgId: string
  assetNumber: string
  name: string
  occurredAt: Date
}

export interface AssetStatusChangedEvent {
  type: 'asset.status_changed'
  assetId: string
  orgId: string
  from: AssetStatus
  to: AssetStatus
  occurredAt: Date
  actorId: string
}

export interface AssetOperatorAssignedEvent {
  type: 'asset.operator_assigned'
  assetId: string
  ownerOrgId: string
  operatorOrgId: string
  assignmentId: string
  occurredAt: Date
  approvedBy: string
}

export interface AssetOperatorReturnedEvent {
  type: 'asset.operator_returned'
  assetId: string
  ownerOrgId: string
  operatorOrgId: string
  assignmentId: string
  occurredAt: Date
}

export interface AssetInspectionCompletedEvent {
  type: 'asset.inspection_completed'
  assetId: string
  orgId: string
  inspectionId: string
  result: 'PASS' | 'FAIL' | 'CONDITIONAL'
  occurredAt: Date
}

export interface AssetMaintenanceRequiredEvent {
  type: 'asset.maintenance_required'
  assetId: string
  orgId: string
  reason: string
  occurredAt: Date
}
