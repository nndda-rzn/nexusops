// ─────────────────────────────────────────
// Plan — approved optimization result, activatable
// ─────────────────────────────────────────

export type PlanStatus = 'DRAFT' | 'ACTIVE' | 'SUPERSEDED' | 'ARCHIVED'
export type PlanType = 'BERTH' | 'CRANE' | 'YARD' | 'WORKFORCE' | 'ROUTE' | 'TRAIN' | 'NETWORK'

export const PLAN_TYPES: PlanType[] = [
  'BERTH', 'CRANE', 'YARD', 'WORKFORCE', 'ROUTE', 'TRAIN', 'NETWORK',
]

const VALID_TRANSITIONS: Record<PlanStatus, PlanStatus[]> = {
  DRAFT:      ['ACTIVE', 'ARCHIVED'],
  ACTIVE:     ['SUPERSEDED', 'ARCHIVED'],
  SUPERSEDED: ['ACTIVE', 'ARCHIVED'],
  ARCHIVED:   [],
}

export interface PlanProps {
  id: string
  orgId: string
  name: string
  planType: PlanType
  status: PlanStatus
  validFrom?: Date | undefined
  validUntil?: Date | undefined
  optimizationJobId?: string | undefined
  scenarioId?: string | undefined
  createdBy: string
  approvedBy?: string | undefined
  approvedAt?: Date | undefined
  activatedAt?: Date | undefined
  supersededBy?: string | undefined
  createdAt: Date
  updatedAt: Date
}

export class Plan {
  private props: PlanProps

  private constructor(props: PlanProps) {
    this.props = props
  }

  get id() { return this.props.id }
  get orgId() { return this.props.orgId }
  get planType() { return this.props.planType }
  get status() { return this.props.status }
  get name() { return this.props.name }

  transition(to: PlanStatus): void {
    const allowed = VALID_TRANSITIONS[this.props.status] ?? []
    if (!allowed.includes(to)) {
      throw new Error(`Cannot transition plan from '${this.props.status}' to '${to}'.`)
    }
    this.props.status = to
    this.props.updatedAt = new Date()
  }

  approve(approvedBy: string): void {
    if (this.props.status !== 'DRAFT') {
      throw new Error(`Only DRAFT plans can be approved (current: '${this.props.status}').`)
    }
    this.props.approvedBy = approvedBy
    this.props.approvedAt = new Date()
    this.props.updatedAt = new Date()
  }

  activate(): void {
    if (this.props.status === 'DRAFT' && !this.props.approvedBy) {
      throw new Error('DRAFT plan must be approved before activation.')
    }
    this.transition('ACTIVE')
    this.props.activatedAt = new Date()
  }

  toSnapshot(): PlanProps { return { ...this.props } }
  static create(props: PlanProps): Plan { return new Plan({ ...props, status: 'DRAFT' }) }
  static fromSnapshot(props: PlanProps): Plan { return new Plan({ ...props }) }
}