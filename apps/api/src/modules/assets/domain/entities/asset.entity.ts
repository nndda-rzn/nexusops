// ─────────────────────────────────────────
// Asset Entity — State Machine
// ─────────────────────────────────────────

export type AssetStatus = 'ACTIVE' | 'IDLE' | 'ASSIGNED_OUT' | 'MAINTENANCE' | 'BREAKDOWN' | 'INSPECTION' | 'DECOMMISSIONED' | 'DISPOSED'
export type AssetCondition = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL'

// P3R-04 FIX: valid transition map (consistent with trip/train/flight entities)
const VALID_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  ACTIVE:         ['IDLE', 'MAINTENANCE', 'BREAKDOWN', 'INSPECTION', 'ASSIGNED_OUT', 'DECOMMISSIONED'],
  IDLE:           ['ACTIVE', 'MAINTENANCE', 'BREAKDOWN', 'INSPECTION', 'ASSIGNED_OUT'],
  ASSIGNED_OUT:   ['ACTIVE', 'MAINTENANCE', 'BREAKDOWN', 'INSPECTION'],
  MAINTENANCE:    ['ACTIVE', 'IDLE', 'BREAKDOWN'],
  BREAKDOWN:      ['MAINTENANCE', 'DECOMMISSIONED'],
  INSPECTION:     ['ACTIVE', 'MAINTENANCE'],
  DECOMMISSIONED: ['DISPOSED'],
  DISPOSED:       [],
}

export interface AssetProps {
  id: string
  orgId: string
  assetNumber: string
  categoryId?: string | undefined
  name: string
  serialNumber?: string | undefined
  manufacturer?: string | undefined
  model?: string | undefined
  yearManufactured?: number | undefined
  yearAcquired?: number | undefined
  acquisitionCost?: string | undefined
  currentValue?: string | undefined
  ownerOrgId: string
  operatorOrgId?: string | undefined
  status: AssetStatus
  condition: AssetCondition
  createdAt: Date
  updatedAt: Date
}

export class Asset {
  constructor(private props: AssetProps) {}

  get id() { return this.props.id }
  get orgId() { return this.props.orgId }
  get assetNumber() { return this.props.assetNumber }
  get name() { return this.props.name }
  get status() { return this.props.status }
  get ownerOrgId() { return this.props.ownerOrgId }
  get operatorOrgId() { return this.props.operatorOrgId }

  updateStatus(status: AssetStatus): void {
    // P3R-04 FIX: reject transitions outside the state machine
    const allowed = VALID_TRANSITIONS[this.props.status] ?? []
    if (!allowed.includes(status)) {
      throw new Error(`Cannot transition asset from '${this.props.status}' to '${status}'.`)
    }
    // P3R-04 FIX: DECOMMISSIONED requires no active operator assignment
    if (status === 'DECOMMISSIONED' && this.props.operatorOrgId) {
      throw new Error(`Cannot decommission asset '${this.props.id}' — it is assigned to operator '${this.props.operatorOrgId}'.`)
    }
    this.props.status = status
    this.props.updatedAt = new Date()
  }

  assignOperator(operatorOrgId: string): void {
    if (this.props.status !== 'ACTIVE' && this.props.status !== 'IDLE') {
      throw new Error(`Cannot assign asset in status '${this.props.status}'. Asset must be ACTIVE or IDLE.`)
    }
    this.props.operatorOrgId = operatorOrgId
    this.props.status = 'ASSIGNED_OUT'
    this.props.updatedAt = new Date()
  }

  returnOperator(): void {
    // P3R-04 FIX: only valid from ASSIGNED_OUT
    if (this.props.status !== 'ASSIGNED_OUT') {
      throw new Error(`Cannot return operator — asset is not ASSIGNED_OUT (status: '${this.props.status}').`)
    }
    this.props.operatorOrgId = undefined
    this.props.status = 'ACTIVE'
    this.props.updatedAt = new Date()
  }

  toSnapshot(): AssetProps { return { ...this.props } }
  static fromSnapshot(props: AssetProps): Asset { return new Asset(props) }
}