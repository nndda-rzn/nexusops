import type { OperationType, OperationStatus } from '../entities/operation.entity'

export interface OperationCreatedEvent {
  type: 'operation.created'
  operationId: string
  orgId: string
  operationType: OperationType
  referenceId?: string | undefined
  referenceType?: string | undefined
  scheduledStart?: Date | undefined
  occurredAt: Date
  actorId: string
}

export interface OperationStartedEvent {
  type: 'operation.started'
  operationId: string
  orgId: string
  operationType: OperationType
  actualStart: Date
  occurredAt: Date
  actorId: string
}

export interface OperationCompletedEvent {
  type: 'operation.completed'
  operationId: string
  orgId: string
  operationType: OperationType
  actualEnd: Date
  occurredAt: Date
  actorId: string
}

export interface OperationDelayedEvent {
  type: 'operation.delayed'
  operationId: string
  orgId: string
  operationType: OperationType
  delayMinutes: number
  totalDelayMinutes: number
  occurredAt: Date
  actorId: string
}

export interface OperationCancelledEvent {
  type: 'operation.cancelled'
  operationId: string
  orgId: string
  operationType: OperationType
  reason: string
  cancelledBy: string
  occurredAt: Date
}

export interface OperationStatusChangedEvent {
  type: 'operation.status_changed'
  operationId: string
  orgId: string
  from: OperationStatus
  to: OperationStatus
  occurredAt: Date
  actorId: string
}

export interface InterventionRequestedEvent {
  type: 'operation.intervention_requested'
  interventionId: string
  orgId: string
  targetOrgId: string
  operationId: string
  interventionType: string
  slaDeadline: Date
  occurredAt: Date
  requestedBy: string
}

export interface InterventionExecutedEvent {
  type: 'operation.intervention_executed'
  interventionId: string
  orgId: string
  targetOrgId: string
  operationId: string
  interventionType: string
  proposedChanges: Record<string, unknown>   // L-02 FIX: added for execution
  occurredAt: Date
  executedAt: Date
  wasAutoApproved: boolean
  respondedBy?: string | undefined           // L-02 FIX: added
}

export type OperationEvent =
  | OperationCreatedEvent
  | OperationStartedEvent
  | OperationCompletedEvent
  | OperationDelayedEvent
  | OperationCancelledEvent
  | OperationStatusChangedEvent
  | InterventionRequestedEvent
  | InterventionExecutedEvent
