// Operation type constants and enums

export const OPERATION_TYPES = [
  'VESSEL_ARRIVAL', 'VESSEL_BERTHING', 'VESSEL_UNBERTHING',
  'CONTAINER_DISCHARGE', 'CONTAINER_LOADING', 'YARD_MOVE',
  'TRAIN_ARRIVAL', 'TRAIN_DEPARTURE',
  'TRUCK_GATE_IN', 'TRUCK_GATE_OUT',
  'WAREHOUSE_RECEIVING', 'WAREHOUSE_DISPATCH',
  'FLIGHT_ARRIVAL', 'FLIGHT_DEPARTURE', 'CARGO_LOADING_AIR',
  'MAINTENANCE', 'INSPECTION', 'INTERMODAL_HANDOVER',
] as const

export const OPERATION_STATUSES = [
  'SCHEDULED', 'IN_PROGRESS', 'COMPLETED',
  'CANCELLED', 'DELAYED', 'ON_HOLD',
] as const

export const OPERATION_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'] as const

export type OperationType = typeof OPERATION_TYPES[number]
export type OperationStatus = typeof OPERATION_STATUSES[number]
export type OperationPriority = typeof OPERATION_PRIORITIES[number]

export const VALID_TRANSITIONS: Record<OperationStatus, OperationStatus[]> = {
  SCHEDULED:   ['IN_PROGRESS', 'CANCELLED', 'ON_HOLD'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED', 'DELAYED', 'ON_HOLD'],
  DELAYED:     ['IN_PROGRESS', 'CANCELLED', 'ON_HOLD'],
  ON_HOLD:     ['SCHEDULED', 'IN_PROGRESS', 'CANCELLED'],
  COMPLETED:   [],
  CANCELLED:   [],
}

export interface CreateOperationProps {
  orgId: string
  type: OperationType
  referenceId?: string | undefined
  referenceType?: string | undefined
  isCrossEntity?: boolean | undefined
  relatedEntityIds?: string[] | undefined
  scheduledStart?: Date | undefined
  scheduledEnd?: Date | undefined
  priority?: OperationPriority | undefined
  createdBy: string
}

export interface OperationProps {
  id: string
  orgId: string
  type: OperationType
  status: OperationStatus
  priority: OperationPriority
  referenceId?: string | undefined
  referenceType?: string | undefined
  isCrossEntity: boolean
  relatedEntityIds: string[]
  scheduledStart?: Date | undefined
  scheduledEnd?: Date | undefined
  actualStart?: Date | undefined
  actualEnd?: Date | undefined
  delayMinutes: number
  cancelledBy?: string | undefined
  cancellationReason?: string | undefined
  createdBy: string
  createdAt: Date
  updatedAt: Date
}
