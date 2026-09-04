// ─────────────────────────────────────────
// WorkOrder Entity — State Machine
// ─────────────────────────────────────────

export type WorkOrderStatus = 'DRAFT' | 'APPROVED' | 'SCHEDULED' | 'ASSIGNED' | 'IN_PROGRESS' | 'PENDING_PARTS' | 'COMPLETED' | 'CLOSED'
export type WorkOrderType = 'PREVENTIVE' | 'CORRECTIVE' | 'INSPECTION' | 'EMERGENCY'
export type WorkOrderPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'

const VALID_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  DRAFT:         ['APPROVED'],
  APPROVED:      ['SCHEDULED', 'ASSIGNED'],
  SCHEDULED:     ['ASSIGNED', 'IN_PROGRESS'],
  ASSIGNED:      ['IN_PROGRESS'],
  IN_PROGRESS:   ['PENDING_PARTS', 'COMPLETED'],
  PENDING_PARTS: ['IN_PROGRESS', 'COMPLETED'],
  COMPLETED:     ['CLOSED'],
  CLOSED:        [],
}

export interface WorkOrderProps {
  id: string
  orgId: string
  workOrderNumber: string
  assetId: string
  type: WorkOrderType
  priority: WorkOrderPriority
  title: string
  description?: string | undefined
  status: WorkOrderStatus
  assignedTo?: string | undefined
  approvedBy?: string | undefined
  approvedAt?: Date | undefined
  scheduledStart?: Date | undefined
  scheduledEnd?: Date | undefined
  actualStart?: Date | undefined
  actualEnd?: Date | undefined
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export class WorkOrder {
  constructor(private props: WorkOrderProps) {}

  get id() { return this.props.id }
  get orgId() { return this.props.orgId }
  get status() { return this.props.status }
  get workOrderNumber() { return this.props.workOrderNumber }

  transition(to: WorkOrderStatus): void {
    const allowed = VALID_TRANSITIONS[this.props.status] ?? []
    if (!allowed.includes(to)) {
      throw new Error(`Cannot transition work order from '${this.props.status}' to '${to}'.`)
    }
    this.props.status = to
    this.props.updatedAt = new Date()
  }

  approve(approvedBy: string): void {
    this.transition('APPROVED')
    this.props.approvedBy = approvedBy
    this.props.approvedAt = new Date()
  }

  assign(employeeId: string): void {
    this.props.assignedTo = employeeId
    if (this.props.status === 'APPROVED' || this.props.status === 'SCHEDULED') {
      this.props.status = 'ASSIGNED'
    }
    this.props.updatedAt = new Date()
  }

  start(): void {
    this.transition('IN_PROGRESS')
    this.props.actualStart = new Date()
    this.props.updatedAt = new Date()
  }

  complete(): void {
    this.transition('COMPLETED')
    this.props.actualEnd = new Date()
    this.props.updatedAt = new Date()
  }

  toSnapshot(): WorkOrderProps { return { ...this.props } }
  static fromSnapshot(props: WorkOrderProps): WorkOrder { return new WorkOrder(props) }
}
