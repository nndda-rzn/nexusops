import type { VesselType, VesselStatus } from '../entities/vessel.entity'

export interface VesselRegisteredEvent {
  type: 'vessel.registered'
  vesselId: string
  orgId: string
  imoNumber: string
  name: string
  vesselType: VesselType
  occurredAt: Date
}

export interface VesselStatusChangedEvent {
  type: 'vessel.status_changed'
  vesselId: string
  orgId: string
  from: VesselStatus
  to: VesselStatus
  occurredAt: Date
  actorId: string
}

export interface VesselEtaChangedEvent {
  type: 'vessel.eta_changed'
  vesselId: string
  orgId: string
  portCallId: string
  eta: Date
  occurredAt: Date
  actorId: string
}

export interface VesselArrivedEvent {
  type: 'vessel.arrived'
  vesselId: string
  orgId: string
  portCallId: string
  ata: Date
  occurredAt: Date
}

export interface VesselBerthedEvent {
  type: 'vessel.berthed'
  vesselId: string
  orgId: string
  portCallId: string
  berthId?: string | undefined
  atb: Date
  occurredAt: Date
}

export interface VesselDepartedEvent {
  type: 'vessel.departed'
  vesselId: string
  orgId: string
  portCallId: string
  atd: Date
  occurredAt: Date
}

export interface PortCallAnnouncedEvent {
  type: 'port_call.announced'
  portCallId: string
  orgId: string
  voyageId: string
  vesselId: string
  portId?: string | undefined
  eta?: Date | undefined
  occurredAt: Date
}

export interface VesselPositionUpdatedEvent {
  type: 'vessel.position_updated'
  vesselId: string
  position: string  // WKT
  speed?: string | undefined
  heading?: string | undefined
  recordedAt: Date
}
