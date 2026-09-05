// ─────────────────────────────────────────
// Optimization Job — State Machine
// ─────────────────────────────────────────
// PENDING  → QUEUED          (outbox publisher forwards to Redis)
// QUEUED   → RUNNING         (worker claims job)
// RUNNING  → COMPLETED | FAILED
// FAILED   → RETRYING | DEAD | CANCELLED
// RETRYING → QUEUED | DEAD
// PENDING  → CANCELLED       (operator cancels before dispatch)

export type OptimizationJobStatus =
  | 'PENDING' | 'QUEUED' | 'RUNNING' | 'COMPLETED'
  | 'FAILED' | 'RETRYING' | 'DEAD' | 'CANCELLED'

export type OptimizationJobType =
  | 'YARD_OPTIMIZATION' | 'BERTH_SCHEDULING' | 'CRANE_SCHEDULING'
  | 'WORKFORCE_SCHEDULING' | 'ROUTE_OPTIMIZATION' | 'TRAIN_SCHEDULING'
  | 'NETWORK_ANALYSIS' | 'CRITICAL_PATH' | 'DELAY_PROPAGATION'

export const OPTIMIZATION_JOB_TYPES: OptimizationJobType[] = [
  'YARD_OPTIMIZATION', 'BERTH_SCHEDULING', 'CRANE_SCHEDULING',
  'WORKFORCE_SCHEDULING', 'ROUTE_OPTIMIZATION', 'TRAIN_SCHEDULING',
  'NETWORK_ANALYSIS', 'CRITICAL_PATH', 'DELAY_PROPAGATION',
]

export interface OptimizationJobProps {
  id: string
  orgId: string
  jobType: OptimizationJobType
  status: OptimizationJobStatus
  input: unknown
  result?: unknown | undefined
  error?: string | undefined
  retryCount: number
  maxRetries: number
  nextRetryAt?: Date | undefined
  workerId?: string | undefined
  claimedAt?: Date | undefined
  heartbeatAt?: Date | undefined
  idempotencyKey?: string | undefined
  createdBy: string
  createdAt: Date
  queuedAt?: Date | undefined
  startedAt?: Date | undefined
  completedAt?: Date | undefined
  failedAt?: Date | undefined
}

const VALID_TRANSITIONS: Record<OptimizationJobStatus, OptimizationJobStatus[]> = {
  PENDING:   ['QUEUED', 'CANCELLED'],
  QUEUED:    ['RUNNING', 'RETRYING', 'CANCELLED'],
  RUNNING:   ['COMPLETED', 'FAILED'],
  FAILED:    ['RETRYING', 'DEAD', 'CANCELLED'],
  RETRYING:  ['QUEUED', 'DEAD'],
  COMPLETED: [],
  DEAD:      [],
  CANCELLED: [],
}

export class OptimizationJob {
  private props: OptimizationJobProps

  private constructor(props: OptimizationJobProps) {
    this.props = props
  }

  get id() { return this.props.id }
  get orgId() { return this.props.orgId }
  get jobType() { return this.props.jobType }
  get status() { return this.props.status }
  get input() { return this.props.input }
  get retryCount() { return this.props.retryCount }
  get maxRetries() { return this.props.maxRetries }
  get error() { return this.props.error }
  get result() { return this.props.result }
  get workerId() { return this.props.workerId }

  transition(to: OptimizationJobStatus): void {
    const allowed = VALID_TRANSITIONS[this.props.status] ?? []
    if (!allowed.includes(to)) {
      throw new Error(`Cannot transition optimization job from '${this.props.status}' to '${to}'.`)
    }
    this.props.status = to
    const now = new Date()
    switch (to) {
      case 'QUEUED':   this.props.queuedAt = this.props.queuedAt ?? now; break
      case 'RUNNING':  this.props.startedAt = this.props.startedAt ?? now; this.props.claimedAt = now; break
      case 'COMPLETED': this.props.completedAt = now; break
      case 'FAILED':   this.props.failedAt = now; break
      case 'RETRYING': break
      case 'CANCELLED': break
      default: break
    }
  }

  claim(workerId: string): void {
    this.transition('RUNNING')
    this.props.workerId = workerId
    this.props.claimedAt = new Date()
    this.props.heartbeatAt = new Date()
  }

  complete(result: unknown): void {
    this.transition('COMPLETED')
    this.props.result = result
    this.props.error = undefined
  }

  fail(error: string, maxRetries: number): void {
    this.transition('FAILED')
    this.props.error = error
    this.props.retryCount += 1
    if (this.props.retryCount >= maxRetries) {
      this.props.status = 'DEAD'
    }
  }

  toSnapshot(): OptimizationJobProps { return { ...this.props } }
  static create(props: OptimizationJobProps): OptimizationJob {
    return new OptimizationJob({ ...props, status: 'PENDING', retryCount: 0 })
  }
  static fromSnapshot(props: OptimizationJobProps): OptimizationJob {
    return new OptimizationJob({ ...props })
  }
}
