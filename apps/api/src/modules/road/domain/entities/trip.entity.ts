import { InvalidTripTransitionError } from '../errors/invalid-trip-transition.error'

export type TripStatus =
  | 'PLANNED' | 'ASSIGNED' | 'DISPATCHED' | 'EN_ROUTE'
  | 'AT_CHECKPOINT' | 'ARRIVED_DESTINATION' | 'DELIVERING'
  | 'COMPLETED' | 'DELAYED' | 'BREAKDOWN' | 'CANCELLED'

const VALID_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  PLANNED:              ['ASSIGNED', 'CANCELLED'],
  ASSIGNED:             ['DISPATCHED', 'CANCELLED'],
  DISPATCHED:           ['EN_ROUTE', 'CANCELLED'],
  EN_ROUTE:             ['AT_CHECKPOINT', 'ARRIVED_DESTINATION', 'DELAYED', 'BREAKDOWN', 'CANCELLED'],
  AT_CHECKPOINT:        ['EN_ROUTE', 'ARRIVED_DESTINATION', 'DELAYED', 'CANCELLED'],
  ARRIVED_DESTINATION:  ['DELIVERING', 'COMPLETED'],
  DELIVERING:           ['COMPLETED', 'CANCELLED'],
  COMPLETED:            [],
  DELAYED:              ['EN_ROUTE', 'CANCELLED'],
  BREAKDOWN:            ['CANCELLED'],
  CANCELLED:            [],
}

export interface TripProps {
  id: string
  orgId: string
  referenceNumber: string
  vehicleId?: string | undefined
  driverId?: string | undefined
  shipmentId?: string | undefined
  containerId?: string | undefined
  origin: string
  destination: string
  routeId?: string | undefined
  scheduledDeparture?: Date | undefined
  scheduledArrival?: Date | undefined
  actualDeparture?: Date | undefined
  actualArrival?: Date | undefined
  status: TripStatus
  delayMinutes: number
  dispatcherId?: string | undefined
  notes?: string | undefined
  cancellationReason?: string | undefined
  createdAt: Date
  updatedAt: Date
}

export class Trip {
  constructor(private props: TripProps) {}

  get id() { return this.props.id }
  get orgId() { return this.props.orgId }
  get referenceNumber() { return this.props.referenceNumber }
  get status() { return this.props.status }
  get delayMinutes() { return this.props.delayMinutes }

  transition(to: TripStatus): void {
    const allowed = VALID_TRANSITIONS[this.props.status] ?? []
    if (!allowed.includes(to)) {
      throw new InvalidTripTransitionError(this.props.status, to)
    }
    this.props.status = to
    this.props.updatedAt = new Date()
  }

  assign(vehicleId: string, driverId: string): void {
    this.props.vehicleId = vehicleId
    this.props.driverId = driverId
    this.props.updatedAt = new Date()
  }

  dispatch(dispatcherId: string): void {
    this.props.dispatcherId = dispatcherId
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

  delay(minutes: number): void {
    this.props.delayMinutes += minutes
    this.props.updatedAt = new Date()
  }

  cancel(reason: string): void {
    this.transition('CANCELLED')
    this.props.cancellationReason = reason
    this.props.updatedAt = new Date()
  }

  toSnapshot(): TripProps { return { ...this.props } }

  static fromSnapshot(props: TripProps): Trip { return new Trip(props) }
}
