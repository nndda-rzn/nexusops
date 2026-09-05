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
  get type() { return this.props.type }

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

  // P3R-06 FIX: guard — assign only valid once APPROVED/SCHEDULED
  assign(employeeId: string): void {
    if (this.props.status !== 'APPROVED' && this.props.status !== 'SCHEDULED') {
      throw new Error(`Cannot assign work order in status '${this.props.status}'. It must be APPROVED first.`)
    }
    this.props.assignedTo = employeeId
    this.props.status = 'ASSIGNED'
    this.props.updatedAt = new Date()
  }

  start(): void {
    this.transition('IN_PROGRESS')
    this.props.actualStart = new Date()
    this.props.updatedAt = new Date()
  }

  // P3R-06 FIX: EMERGENCY bypasses approve/assign — DRAFT can go straight to work
  emergencyStart(employeeId: string): void {
    if (this.props.type !== 'EMERGENCY') {
      throw new Error(`emergencyStart() only applies to EMERGENCY work orders (type: '${this.props.type}').`)
    }
    if (this.props.status !== 'DRAFT' && this.props.status !== 'ASSIGNED') {
      throw new Error(`Cannot emergency-start work order in status '${this.props.status}'.`)
    }
    this.props.assignedTo = employeeId
    this.props.status = 'IN_PROGRESS'
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