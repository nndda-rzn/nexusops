// ─────────────────────────────────────────
// Inline event type definitions
// Events that don't have dedicated domain event files yet
// ─────────────────────────────────────────

// Intermodal
export interface HandoverRequestedEvent { type: 'intermodal.handover_requested'; handoverId: string; shipmentId: string; legId: string; fromEntityId: string; toEntityId: string; occurredAt: Date }
export interface HandoverAcceptedEvent { type: 'intermodal.handover_accepted'; handoverId: string; shipmentId: string; legId?: string | undefined; fromEntityId: string; toEntityId: string; occurredAt: Date; respondedBy: string }
export interface HandoverRejectedEvent { type: 'intermodal.handover_rejected'; handoverId: string; shipmentId: string; legId?: string | undefined; fromEntityId: string; toEntityId: string; occurredAt: Date; respondedBy: string; rejectionReason?: string | undefined }
export interface HandoverCompletedEvent { type: 'intermodal.handover_completed'; handoverId: string; shipmentId: string; legId: string; fromEntityId: string; toEntityId: string; occurredAt: Date; completedBy: string }
export interface HandoverCancelledEvent { type: 'intermodal.handover_cancelled'; handoverId: string; shipmentId: string; fromEntityId: string; toEntityId: string; reason?: string | undefined; occurredAt: Date; cancelledBy: string }

// Shipments (Phase 1)
export interface ShipmentCreatedEvent { type: 'shipment.created'; shipmentId: string; orgId: string; referenceNumber: string; shipmentType: string; occurredAt: Date; actorId: string }
export interface ShipmentStatusChangedEvent { type: 'shipment.status_changed'; shipmentId: string; orgId: string; from: string; to: string; occurredAt: Date; actorId: string }
export interface ShipmentMilestoneReachedEvent { type: 'shipment.milestone_reached'; shipmentId: string; orgId: string; milestoneType: string; location?: string | undefined; occurredAt: Date; actorId: string }
export interface ShipmentExceptionRaisedEvent { type: 'shipment.exception_raised'; shipmentId: string; orgId: string; exceptionType: string; description: string; occurredAt: Date; actorId: string }

// Containers (Phase 1)
export interface ContainerAnnouncedEvent { type: 'container.announced'; containerId: string; orgId: string; containerNumber: string; occurredAt: Date }
export interface ContainerMovedEvent { type: 'container.moved'; containerId: string; orgId: string; containerNumber?: string | undefined; toLocationType: string; toLocationId: string; occurredAt: Date; actorId: string }
export interface ContainerGateInEvent { type: 'container.gate_in'; containerId: string; orgId: string; containerNumber?: string | undefined; gateId: string; occurredAt: Date; actorId: string }
export interface ContainerGateOutEvent { type: 'container.gate_out'; containerId: string; orgId: string; containerNumber?: string | undefined; gateId: string; occurredAt: Date; actorId: string }
export interface ContainerDischargedEvent { type: 'container.discharged'; containerId: string; orgId: string; containerNumber?: string | undefined; fromStatus: string; vesselId: string; berthId: string; occurredAt: Date; actorId: string }
export interface ContainerHeldEvent { type: 'container.held'; containerId: string; orgId: string; holdType: string; reason?: string | undefined; occurredAt: Date; actorId: string }
export interface ContainerReleasedEvent { type: 'container.released'; containerId: string; orgId: string; holdId: string; holdType: string; occurredAt: Date; actorId: string }

// Road position
export interface VehiclePositionUpdatedEvent { type: 'vehicle.position_updated'; vehicleId: string; position: string; speed?: string | undefined; heading?: string | undefined; recordedAt: Date }
