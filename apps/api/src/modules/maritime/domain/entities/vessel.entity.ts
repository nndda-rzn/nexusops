// ─────────────────────────────────────────
// Vessel Entity
// ─────────────────────────────────────────

export type VesselType = 'CONTAINER' | 'BULK' | 'TANKER' | 'RORO' | 'GENERAL_CARGO' | 'LNG' | 'LPG'
export type VesselStatus = 'ACTIVE' | 'IN_VOYAGE' | 'MAINTENANCE' | 'LAID_UP'

export interface VesselProps {
  id: string
  orgId: string
  imoNumber: string
  mmsi?: string | undefined
  name: string
  type: VesselType
  flag?: string | undefined
  grossTonnage?: string | undefined
  loa?: string | undefined
  beam?: string | undefined
  maxDraft?: string | undefined
  teuCapacity?: number | undefined
  owner?: string | undefined
  operator?: string | undefined
  status: VesselStatus
  createdAt: Date
  updatedAt: Date
}

export class Vessel {
  constructor(private props: VesselProps) {}

  get id() { return this.props.id }
  get orgId() { return this.props.orgId }
  get imoNumber() { return this.props.imoNumber }
  get name() { return this.props.name }
  get type() { return this.props.type }
  get status() { return this.props.status }
  get loa() { return this.props.loa }
  get maxDraft() { return this.props.maxDraft }

  updateStatus(status: VesselStatus): void {
    this.props.status = status
    this.props.updatedAt = new Date()
  }

  toSnapshot(): VesselProps {
    return { ...this.props }
  }

  static fromSnapshot(props: VesselProps): Vessel {
    return new Vessel(props)
  }
}
