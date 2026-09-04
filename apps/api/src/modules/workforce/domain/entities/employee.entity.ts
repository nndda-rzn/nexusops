// ─────────────────────────────────────────
// Employee Entity
// ─────────────────────────────────────────

export type EmployeeType = 'PERMANENT' | 'CONTRACT' | 'OUTSOURCE'
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'RESIGNED'

export interface EmployeeProps {
  id: string
  orgId: string
  userId?: string | undefined
  employeeNumber: string
  name: string
  email: string
  phone?: string | undefined
  department?: string | undefined
  position?: string | undefined
  type: EmployeeType
  joinDate: string
  status: EmployeeStatus
  createdAt: Date
  updatedAt: Date
}

export class Employee {
  constructor(private props: EmployeeProps) {}

  get id() { return this.props.id }
  get orgId() { return this.props.orgId }
  get employeeNumber() { return this.props.employeeNumber }
  get name() { return this.props.name }
  get status() { return this.props.status }

  updateStatus(status: EmployeeStatus): void {
    this.props.status = status
    this.props.updatedAt = new Date()
  }

  toSnapshot(): EmployeeProps { return { ...this.props } }
  static fromSnapshot(props: EmployeeProps): Employee { return new Employee(props) }
}
