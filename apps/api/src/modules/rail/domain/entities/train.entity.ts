// ─────────────────────────────────────────
// Train Entity — State Machine
// ─────────────────────────────────────────

export type TrainStatus =
  | 'SCHEDULED'
  | 'TRAINSET_ASSIGNED'
  | 'CREW_ASSIGNED'
  | 'LOADING'
  | 'READY_TO_DEPART'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'UNLOADING'
  | 'COMPLETED'
  | 'DELAYED'
  | 'CANCELLED'

const VALID_TRANSITIONS: Record<TrainStatus, TrainStatus[]> = {
  SCHEDULED:        ['TRAINSET_ASSIGNED', 'CANCELLED'],
  TRAINSET_ASSIGNED: ['CREW_ASSIGNED', 'CANCELLED'],
  CREW_ASSIGNED:    ['LOADING', 'CANCELLED'],
  LOADING:          ['READY_TO_DEPART', 'CANCELLED'],
  READY_TO_DEPART:  ['EN_ROUTE', 'CANCELLED'],
  EN_ROUTE:         ['ARRIVED', 'DELAYED', 'CANCELLED'],
  ARRIVED:          ['UNLOADING'],
  UNLOADING:        ['COMPLETED'],
  COMPLETED:        [],
  DELAYED:          ['EN_ROUTE', 'CANCELLED'],
  CANCELLED:        [],
}

export interface TrainProps {
  id: string
  orgId: string
  serviceId: string
  trainNumber: string
  trainsetId?: string | undefined
  scheduledDeparture: Date
  scheduledArrival: Date
  actualDeparture?: Date | undefined
  actualArrival?: Date | undefined
  status: TrainStatus
  delayMinutes: number
  cancellationReason?: string | undefined
  createdAt: Date
  updatedAt: Date
}

export class Train {
  constructor(private props: TrainProps) {}

  get id() { return this.props.id }
  get orgId() { return this.props.orgId }
  get trainNumber() { return this.props.trainNumber }
  get status() { return this.props.status }
  get delayMinutes() { return this.props.delayMinutes }

  transition(to: TrainStatus): void {
    const allowed = VALID_TRANSITIONS[this.props.status] ?? []
    if (!allowed.includes(to)) {
      throw new Error(`Cannot transition train from '${this.props.status}' to '${to}'.`)
    }
    this.props.status = to
    this.props.updatedAt = new Date()
  }

  assignTrainset(trainsetId: string): void {
    this.props.trainsetId = trainsetId
    this.props.updatedAt = new Date()
  }

  recordDeparture(actualDeparture: Date): void {
    this.props.actualDeparture = actualDeparture
    this.props.updatedAt = new Date()
  }

  recordArrival(actualArrival: Date): void {
    this.props.actualArrival = actualArrival
    this.props.updatedAt = new Date()
  }

  delay(minutes: number, reason?: string): void {
    this.props.delayMinutes += minutes
    if (reason) this.props.cancellationReason = reason
    this.props.updatedAt = new Date()
  }

  cancel(reason: string): void {
    this.transition('CANCELLED')
    this.props.cancellationReason = reason
    this.props.updatedAt = new Date()
  }

  toSnapshot(): TrainProps {
    return { ...this.props }
  }

  static fromSnapshot(props: TrainProps): Train {
    return new Train(props)
  }
}
