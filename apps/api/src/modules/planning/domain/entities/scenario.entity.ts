// ─────────────────────────────────────────
// Scenario — candidate optimization result for comparison
// ─────────────────────────────────────────

export type ScenarioStatus = 'CANDIDATE' | 'SELECTED' | 'REJECTED'
export type ScenarioPlanType = 'BERTH' | 'CRANE' | 'YARD' | 'WORKFORCE' | 'ROUTE' | 'TRAIN' | 'NETWORK'

export interface ScenarioProps {
  id: string
  orgId: string
  planType: ScenarioPlanType
  name: string
  description?: string | undefined
  optimizationJobId?: string | undefined
  metrics?: unknown | undefined
  status: ScenarioStatus
  createdBy: string
  createdAt: Date
}

export class Scenario {
  private props: ScenarioProps

  private constructor(props: ScenarioProps) {
    this.props = props
  }

  get id() { return this.props.id }
  get status() { return this.props.status }
  get metrics() { return this.props.metrics }

  select(): void {
    if (this.props.status !== 'CANDIDATE') {
      throw new Error(`Only CANDIDATE scenarios can be selected (current: '${this.props.status}').`)
    }
    this.props.status = 'SELECTED'
  }

  reject(): void {
    if (this.props.status !== 'CANDIDATE') {
      throw new Error(`Only CANDIDATE scenarios can be rejected (current: '${this.props.status}').`)
    }
    this.props.status = 'REJECTED'
  }

  toSnapshot(): ScenarioProps { return { ...this.props } }
  static fromSnapshot(props: ScenarioProps): Scenario { return new Scenario(props) }
}