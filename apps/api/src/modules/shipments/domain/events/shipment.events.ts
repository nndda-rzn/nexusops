export interface ShipmentLegAddedEvent {
  type: 'shipment.leg_added'
  shipmentId: string
  orgId: string
  legId: string
  sequenceNumber: string
  mode: 'SEA' | 'RAIL' | 'ROAD' | 'AIR'
  origin: string
  destination: string
  occurredAt: Date
}

export interface ShipmentLegStatusUpdatedEvent {
  type: 'shipment.leg_status_updated'
  shipmentId: string
  orgId: string
  legId: string
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DELAYED'
  occurredAt: Date
}

export interface ShipmentExceptionResolvedEvent {
  type: 'shipment.exception_resolved'
  shipmentId: string
  orgId: string
  exceptionId: string
  resolvedBy: string
  occurredAt: Date
}
