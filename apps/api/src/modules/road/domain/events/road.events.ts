export interface TripDispatchedEvent {
  type: 'trip.dispatched'
  tripId: string
  orgId: string
  referenceNumber: string
  vehicleId?: string | undefined
  driverId?: string | undefined
  occurredAt: Date
}

export interface TripDepartedEvent {
  type: 'trip.departed'
  tripId: string
  orgId: string
  referenceNumber: string
  actualDeparture: Date
  occurredAt: Date
}

export interface TripCheckpointReachedEvent {
  type: 'trip.checkpoint_reached'
  tripId: string
  orgId: string
  checkpointId: string
  checkpointType: string
  occurredAt: Date
}

export interface TripDelayedEvent {
  type: 'trip.delayed'
  tripId: string
  orgId: string
  referenceNumber: string
  delayMinutes: number
  totalDelayMinutes: number
  occurredAt: Date
}

export interface TripArrivedEvent {
  type: 'trip.arrived'
  tripId: string
  orgId: string
  referenceNumber: string
  actualArrival: Date
  occurredAt: Date
}

export interface TripCompletedEvent {
  type: 'trip.completed'
  tripId: string
  orgId: string
  referenceNumber: string
  occurredAt: Date
}

export interface VehicleBreakdownEvent {
  type: 'vehicle.breakdown'
  vehicleId: string
  orgId: string
  tripId?: string | undefined
  occurredAt: Date
}

export type RoadEvent =
  | TripDispatchedEvent
  | TripDepartedEvent
  | TripCheckpointReachedEvent
  | TripDelayedEvent
  | TripArrivedEvent
  | TripCompletedEvent
  | VehicleBreakdownEvent
