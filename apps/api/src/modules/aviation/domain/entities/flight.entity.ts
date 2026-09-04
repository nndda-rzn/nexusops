// ─────────────────────────────────────────
// Flight Entity — State Machine
// ─────────────────────────────────────────

export type FlightStatus =
  | 'SCHEDULED' | 'SLOT_CONFIRMED' | 'CARGO_ACCEPTANCE' | 'MANIFEST_CLOSED'
  | 'LOAD_PLANNED' | 'LOADING' | 'READY_FOR_DEPARTURE' | 'DEPARTED'
  | 'ARRIVED' | 'OFFLOADING' | 'COMPLETED' | 'DELAYED' | 'DIVERTED'
  | 'CANCELLED' | 'AOG'

const VALID_TRANSITIONS: Record<FlightStatus, FlightStatus[]> = {
  SCHEDULED:            ['SLOT_CONFIRMED', 'CANCELLED', 'DELAYED'],
  SLOT_CONFIRMED:       ['CARGO_ACCEPTANCE', 'CANCELLED', 'DELAYED'],
  CARGO_ACCEPTANCE:     ['MANIFEST_CLOSED', 'CANCELLED', 'DELAYED'],
  MANIFEST_CLOSED:      ['LOAD_PLANNED', 'CANCELLED'],
  LOAD_PLANNED:         ['LOADING', 'CANCELLED'],
  LOADING:              ['READY_FOR_DEPARTURE', 'CANCELLED'],
  READY_FOR_DEPARTURE:  ['DEPARTED', 'CANCELLED', 'AOG'],
  DEPARTED:             ['ARRIVED', 'DIVERTED', 'DELAYED'],
  ARRIVED:              ['OFFLOADING'],
  OFFLOADING:           ['COMPLETED'],
  COMPLETED:            [],
  DELAYED:              ['SCHEDULED', 'SLOT_CONFIRMED', 'CANCELLED'],
  DIVERTED:             ['ARRIVED', 'CANCELLED'],
  CANCELLED:            [],
  AOG:                  ['CANCELLED'],
}

export interface FlightProps {
  id: string; orgId: string; flightNumber: string; aircraftId: string
  originAirportId?: string | undefined; destinationAirportId?: string | undefined
  scheduledDeparture: Date; scheduledArrival: Date
  actualDeparture?: Date | undefined; actualArrival?: Date | undefined
  status: FlightStatus; slotId?: string | undefined
  createdAt: Date; updatedAt: Date
}

export class Flight {
  constructor(private props: FlightProps) {}

  get id() { return this.props.id }
  get orgId() { return this.props.orgId }
  get flightNumber() { return this.props.flightNumber }
  get status() { return this.props.status }

  transition(to: FlightStatus): void {
    const allowed = VALID_TRANSITIONS[this.props.status] ?? []
    if (!allowed.includes(to)) {
      throw new Error(`Cannot transition flight from '${this.props.status}' to '${to}'.`)
    }
    this.props.status = to
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

  toSnapshot(): FlightProps { return { ...this.props } }
  static fromSnapshot(props: FlightProps): Flight { return new Flight(props) }
}
