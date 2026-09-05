export interface MaintenanceWorkOrderCreatedEvent {
  type: 'maintenance.workorder_created'
  workOrderId: string
  orgId: string
  workOrderNumber: string
  assetId: string
  workOrderType: string
  priority: string
  occurredAt: Date
}

export interface MaintenanceWorkOrderStartedEvent {
  type: 'maintenance.workorder_started'
  workOrderId: string
  orgId: string
  assetId: string
  occurredAt: Date
}

export interface MaintenanceWorkOrderCompletedEvent {
  type: 'maintenance.workorder_completed'
  workOrderId: string
  orgId: string
  assetId: string
  occurredAt: Date
}

export interface MaintenanceWorkOrderClosedEvent {
  type: 'maintenance.workorder_closed'
  workOrderId: string
  orgId: string
  occurredAt: Date
}

export interface MaintenanceFailureReportedEvent {
  type: 'maintenance.failure_reported'
  failureId: string
  orgId: string
  assetId: string
  severity: string
  occurredAt: Date
}
