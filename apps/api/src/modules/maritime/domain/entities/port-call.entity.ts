// ─────────────────────────────────────────
// PortCall Entity — State Machine
// ─────────────────────────────────────────

export type PortCallStatus =
  | 'ANNOUNCED'
  | 'ETA_CONFIRMED'
  | 'PILOTAGE_REQUESTED'
  | 'PILOTAGE_ASSIGNED'
  | 'ARRIVED_ANCHORAGE'
  | 'BERTHING'
  | 'BERTHED'
  | 'OPERATIONS'
  | 'OPERATIONS_COMPLETED'
  | 'UNBERTHING'
  | 'DEPARTED'
  | 'CANCELLED'

const VALID_TRANSITIONS: Record<PortCallStatus, PortCallStatus[]> = {
  ANNOUNCED:             ['ETA_CONFIRMED', 'CANCELLED'],
  ETA_CONFIRMED:         ['PILOTAGE_REQUESTED', 'CANCELLED'],
  PILOTAGE_REQUESTED:    ['PILOTAGE_ASSIGNED', 'CANCELLED'],
  PILOTAGE_ASSIGNED:     ['ARRIVED_ANCHORAGE', 'CANCELLED'],
  ARRIVED_ANCHORAGE:     ['BERTHING', 'CANCELLED'],
  BERTHING:              ['BERTHED', 'CANCELLED'],
  BERTHED:               ['OPERATIONS', 'CANCELLED'],
  OPERATIONS:            ['OPERATIONS_COMPLETED', 'CANCELLED'],
  OPERATIONS_COMPLETED:  ['UNBERTHING'],
  UNBERTHING:            ['DEPARTED'],
  DEPARTED:              [],
  CANCELLED:             [],
}

export interface PortCallProps {
  id: string
  orgId: string
  voyageId: string
  portId?: string | undefined
  eta?: Date | undefined
  etb?: Date | undefined
  etd?: Date | undefined
  ata?: Date | undefined
  atb?: Date | undefined
  atd?: Date | undefined
  status: PortCallStatus
  agentId?: string | undefined
  delayReason?: string | undefined
  notes?: string | undefined
  createdAt: Date
  updatedAt: Date
}

export class PortCall {
  constructor(private props: PortCallProps) {}

  get id() { return this.props.id }
  get orgId() { return this.props.orgId }
  get voyageId() { return this.props.voyageId }
  get status() { return this.props.status }
  get eta() { return this.props.eta }

  transition(to: PortCallStatus): void {
    const allowed = VALID_TRANSITIONS[this.props.status] ?? []
    if (!allowed.includes(to)) {
      throw new Error(
        `Cannot transition port call from '${this.props.status}' to '${to}'.`
      )
    }
    this.props.status = to
    this.props.updatedAt = new Date()
  }

  updateEta(eta: Date): void {
    this.props.eta = eta
    this.props.updatedAt = new Date()
  }

  recordAta(ata: Date): void {
    this.props.ata = ata
    this.props.updatedAt = new Date()
  }

  recordAtb(atb: Date): void {
    this.props.atb = atb
    this.props.updatedAt = new Date()
  }

  recordAtd(atd: Date): void {
    this.props.atd = atd
    this.props.updatedAt = new Date()
  }

  toSnapshot(): PortCallProps {
    return { ...this.props }
  }

  static fromSnapshot(props: PortCallProps): PortCall {
    return new PortCall(props)
  }
}
