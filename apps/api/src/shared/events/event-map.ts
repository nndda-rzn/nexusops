// ─────────────────────────────────────────
// EventMap — Complete Domain Event Type Registry
// ─────────────────────────────────────────
// Q-01 FIX: Typed EventMap ensures compile-time safety for emit() and on().
// Adding a new domain event requires adding it here — enforced by TypeScript.
// ─────────────────────────────────────────

// Operations
import type {
  OperationCreatedEvent, OperationStartedEvent, OperationCompletedEvent,
  OperationDelayedEvent, OperationCancelledEvent, OperationStatusChangedEvent,
  OperationReprioritizedEvent, InterventionRequestedEvent, InterventionExecutedEvent,
} from '@/modules/operations/domain/events/operation.events'

// Maritime
import type {
  VesselRegisteredEvent, VesselStatusChangedEvent, VesselEtaChangedEvent,
  VesselArrivedEvent, VesselBerthedEvent, VesselDepartedEvent,
  PortCallAnnouncedEvent, VesselPositionUpdatedEvent,
} from '@/modules/maritime/domain/events/maritime.events'

// Rail
import type {
  TrainScheduledEvent, TrainDepartedEvent, TrainArrivedEvent,
  TrainDelayedEvent, TrainCancelledEvent,
} from '@/modules/rail/domain/events/rail.events'

// Road
import type {
  TripDispatchedEvent, TripDepartedEvent, TripCheckpointReachedEvent,
  TripDelayedEvent, TripArrivedEvent, TripCompletedEvent, VehicleBreakdownEvent,
} from '@/modules/road/domain/events/road.events'

// Shipments
import type {
  ShipmentLegAddedEvent, ShipmentLegStatusUpdatedEvent, ShipmentExceptionResolvedEvent,
} from '@/modules/shipments/domain/events/shipment.events'

// Terminal
import type {
  TerminalCreatedEvent, TerminalGateCreatedEvent, TerminalGateStatusUpdatedEvent,
  TerminalBerthCreatedEvent, TerminalCraneCreatedEvent,
} from '@/modules/terminal/domain/events/terminal.events'

// ─────────────────────────────────────────
// Inline event types (no dedicated event files yet)
// ─────────────────────────────────────────

export interface HandoverRequestedEvent { type: 'intermodal.handover_requested'; handoverId: string; shipmentId: string; legId: string; fromEntityId: string; toEntityId: string; occurredAt: Date }
export interface HandoverAcceptedEvent { type: 'intermodal.handover_accepted'; handoverId: string; shipmentId: string; legId?: string | undefined; fromEntityId: string; toEntityId: string; occurredAt: Date; respondedBy: string }
export interface HandoverRejectedEvent { type: 'intermodal.handover_rejected'; handoverId: string; shipmentId: string; legId?: string | undefined; fromEntityId: string; toEntityId: string; occurredAt: Date; respondedBy: string; rejectionReason?: string | undefined }
export interface HandoverCompletedEvent { type: 'intermodal.handover_completed'; handoverId: string; shipmentId: string; legId: string; fromEntityId: string; toEntityId: string; occurredAt: Date; completedBy: string }
export interface HandoverCancelledEvent { type: 'intermodal.handover_cancelled'; handoverId: string; shipmentId: string; fromEntityId: string; toEntityId: string; reason?: string | undefined; occurredAt: Date; cancelledBy: string }

export interface ShipmentCreatedEvent { type: 'shipment.created'; shipmentId: string; orgId: string; referenceNumber: string; shipmentType: string; occurredAt: Date; actorId: string }
export interface ShipmentStatusChangedEvent { type: 'shipment.status_changed'; shipmentId: string; orgId: string; from: string; to: string; occurredAt: Date; actorId: string }
export interface ShipmentMilestoneReachedEvent { type: 'shipment.milestone_reached'; shipmentId: string; orgId: string; milestoneType: string; location?: string | undefined; occurredAt: Date; actorId: string }
export interface ShipmentExceptionRaisedEvent { type: 'shipment.exception_raised'; shipmentId: string; orgId: string; exceptionType: string; description: string; occurredAt: Date; actorId: string }

export interface ContainerAnnouncedEvent { type: 'container.announced'; containerId: string; orgId: string; containerNumber: string; occurredAt: Date }
export interface ContainerMovedEvent { type: 'container.moved'; containerId: string; orgId: string; containerNumber?: string | undefined; toLocationType: string; toLocationId: string; occurredAt: Date; actorId: string }
export interface ContainerGateInEvent { type: 'container.gate_in'; containerId: string; orgId: string; containerNumber?: string | undefined; gateId: string; occurredAt: Date; actorId: string }
export interface ContainerGateOutEvent { type: 'container.gate_out'; containerId: string; orgId: string; containerNumber?: string | undefined; gateId: string; occurredAt: Date; actorId: string }
export interface ContainerDischargedEvent { type: 'container.discharged'; containerId: string; orgId: string; containerNumber?: string | undefined; fromStatus: string; vesselId: string; berthId: string; occurredAt: Date; actorId: string }
export interface ContainerHeldEvent { type: 'container.held'; containerId: string; orgId: string; holdType: string; reason?: string | undefined; occurredAt: Date; actorId: string }
export interface ContainerReleasedEvent { type: 'container.released'; containerId: string; orgId: string; holdId: string; holdType: string; occurredAt: Date; actorId: string }

export interface VehiclePositionUpdatedEvent { type: 'vehicle.position_updated'; vehicleId: string; position: string; speed?: string | undefined; heading?: string | undefined; recordedAt: Date }

// ─────────────────────────────────────────
// EventMap — complete registry
// ─────────────────────────────────────────
export type EventMap = {
  // Operations
  'operation.created': OperationCreatedEvent
  'operation.started': OperationStartedEvent
  'operation.completed': OperationCompletedEvent
  'operation.delayed': OperationDelayedEvent
  'operation.cancelled': OperationCancelledEvent
  'operation.status_changed': OperationStatusChangedEvent
  'operation.reprioritized': OperationReprioritizedEvent
  'operation.intervention_requested': InterventionRequestedEvent
  'operation.intervention_executed': InterventionExecutedEvent
  'operation.intervention_rejected': { type: 'operation.intervention_rejected'; interventionId: string; orgId: string; targetOrgId: string; operationId: string; rejectedBy: string; rejectionReason?: string | undefined; occurredAt: Date }
  'operation.dependency_added': { type: 'operation.dependency_added'; orgId: string; operationId: string; dependsOnId: string; dependsOnOrgId: string; dependencyType: string; occurredAt: Date; actorId: string }
  'operation.dependency_removed': { type: 'operation.dependency_removed'; orgId: string; operationId: string; dependsOnId: string; occurredAt: Date; actorId: string }
  // Maritime
  'vessel.registered': VesselRegisteredEvent
  'vessel.status_changed': VesselStatusChangedEvent
  'vessel.eta_changed': VesselEtaChangedEvent
  'vessel.arrived': VesselArrivedEvent
  'vessel.berthed': VesselBerthedEvent
  'vessel.departed': VesselDepartedEvent
  'vessel.position_updated': VesselPositionUpdatedEvent
  'port_call.announced': PortCallAnnouncedEvent
  // Rail
  'train.scheduled': TrainScheduledEvent
  'train.departed': TrainDepartedEvent
  'train.arrived': TrainArrivedEvent
  'train.delayed': TrainDelayedEvent
  'train.cancelled': TrainCancelledEvent
  // Road
  'trip.dispatched': TripDispatchedEvent
  'trip.departed': TripDepartedEvent
  'trip.checkpoint_reached': TripCheckpointReachedEvent
  'trip.delayed': TripDelayedEvent
  'trip.arrived': TripArrivedEvent
  'trip.completed': TripCompletedEvent
  'vehicle.breakdown': VehicleBreakdownEvent
  'vehicle.position_updated': VehiclePositionUpdatedEvent
  // Shipments
  'shipment.created': ShipmentCreatedEvent
  'shipment.status_changed': ShipmentStatusChangedEvent
  'shipment.milestone_reached': ShipmentMilestoneReachedEvent
  'shipment.exception_raised': ShipmentExceptionRaisedEvent
  'shipment.leg_added': ShipmentLegAddedEvent
  'shipment.leg_status_updated': ShipmentLegStatusUpdatedEvent
  'shipment.exception_resolved': ShipmentExceptionResolvedEvent
  // Terminal
  'terminal.created': TerminalCreatedEvent
  'terminal.gate_created': TerminalGateCreatedEvent
  'terminal.gate_status_updated': TerminalGateStatusUpdatedEvent
  'terminal.berth_created': TerminalBerthCreatedEvent
  'terminal.crane_created': TerminalCraneCreatedEvent
  // Crane/Berth — Phase 1
  'berth.assigned': { type: 'berth.assigned'; assignmentId: string; berthId: string; orgId: string; portCallId: string; plannedStart: Date; occurredAt: Date; assignedBy: string }
  'crane.assigned': { type: 'crane.assigned'; assignmentId: string; craneId: string; orgId: string; berthId: string; portCallId: string; occurredAt: Date }
  'crane.breakdown': { type: 'crane.breakdown'; craneId: string; orgId: string; craneCode: string; reportedBy: string; reason: string; occurredAt: Date }
  'crane.restored': { type: 'crane.restored'; craneId: string; orgId: string; craneCode: string; restoredBy: string; occurredAt: Date }
  // Container
  'container.announced': ContainerAnnouncedEvent
  'container.moved': ContainerMovedEvent
  'container.gate_in': ContainerGateInEvent
  'container.gate_out': ContainerGateOutEvent
  'container.discharged': ContainerDischargedEvent
  'container.held': ContainerHeldEvent
  'container.released': ContainerReleasedEvent
  // Intermodal
  'intermodal.handover_requested': HandoverRequestedEvent
  'intermodal.handover_accepted': HandoverAcceptedEvent
  'intermodal.handover_rejected': HandoverRejectedEvent
  'intermodal.handover_completed': HandoverCompletedEvent
  'intermodal.handover_cancelled': HandoverCancelledEvent
}
