// ─────────────────────────────────────────
// EventMap type — references all domain event types
// Split from event-map.ts to keep file under 150 lines
// ─────────────────────────────────────────

import type {
  OperationCreatedEvent, OperationStartedEvent, OperationCompletedEvent,
  OperationDelayedEvent, OperationCancelledEvent, OperationStatusChangedEvent,
  OperationReprioritizedEvent, InterventionRequestedEvent, InterventionExecutedEvent,
} from '@/modules/operations/domain/events/operation.events'
import type {
  VesselRegisteredEvent, VesselStatusChangedEvent, VesselEtaChangedEvent,
  VesselArrivedEvent, VesselBerthedEvent, VesselDepartedEvent,
  PortCallAnnouncedEvent, VesselPositionUpdatedEvent,
} from '@/modules/maritime/domain/events/maritime.events'
import type { TrainScheduledEvent, TrainDepartedEvent, TrainArrivedEvent, TrainDelayedEvent, TrainCancelledEvent } from '@/modules/rail/domain/events/rail.events'
import type { TripDispatchedEvent, TripDepartedEvent, TripCheckpointReachedEvent, TripDelayedEvent, TripArrivedEvent, TripCompletedEvent, VehicleBreakdownEvent } from '@/modules/road/domain/events/road.events'
import type { ShipmentLegAddedEvent, ShipmentLegStatusUpdatedEvent, ShipmentExceptionResolvedEvent } from '@/modules/shipments/domain/events/shipment.events'
import type { TerminalCreatedEvent, TerminalGateCreatedEvent, TerminalGateStatusUpdatedEvent, TerminalBerthCreatedEvent, TerminalCraneCreatedEvent } from '@/modules/terminal/domain/events/terminal.events'
import type { EmployeeRegisteredEvent, EmployeeStatusChangedEvent, WorkforceAssignedEvent, WorkforceAssignmentCompletedEvent } from '@/modules/workforce/domain/events/workforce.events'
import type { AssetRegisteredEvent, AssetStatusChangedEvent, AssetOperatorAssignedEvent, AssetOperatorReturnedEvent, AssetInspectionCompletedEvent, AssetMaintenanceRequiredEvent } from '@/modules/assets/domain/events/assets.events'
import type { MaintenanceWorkOrderCreatedEvent, MaintenanceWorkOrderStartedEvent, MaintenanceWorkOrderCompletedEvent, MaintenanceWorkOrderClosedEvent, MaintenanceFailureReportedEvent } from '@/modules/maintenance/domain/events/maintenance.events'
import type { YardContainerPlacedEvent, YardContainerMovedEvent, YardContainerRemovedEvent, YardSlotReservedEvent } from '@/modules/yard/domain/events/yard.events'
import type { WarehouseReceivedEvent, WarehousePutawayCompletedEvent, WarehousePickingStartedEvent, WarehousePickingCompletedEvent, WarehouseDispatchedEvent, WarehouseInventoryAdjustedEvent, WarehouseCycleCountCompletedEvent } from '@/modules/warehouse/domain/events/warehouse.events'
import type { AviationFlightScheduledEvent, AviationSlotConfirmedEvent, AviationManifestClosedEvent, AviationLoadPlanApprovedEvent, AviationFlightDepartedEvent, AviationFlightArrivedEvent, AviationFlightDelayedEvent, AviationAogDeclaredEvent, AviationCargoAcceptedEvent } from '@/modules/aviation/domain/events/aviation.events'
import type { HandoverRequestedEvent, HandoverAcceptedEvent, HandoverRejectedEvent, HandoverCompletedEvent, HandoverCancelledEvent, ShipmentCreatedEvent, ShipmentStatusChangedEvent, ShipmentMilestoneReachedEvent, ShipmentExceptionRaisedEvent, ContainerAnnouncedEvent, ContainerMovedEvent, ContainerGateInEvent, ContainerGateOutEvent, ContainerDischargedEvent, ContainerHeldEvent, ContainerReleasedEvent, VehiclePositionUpdatedEvent } from '@/shared/events/event-types'

export type EventMap = {
  'operation.created': OperationCreatedEvent; 'operation.started': OperationStartedEvent; 'operation.completed': OperationCompletedEvent
  'operation.delayed': OperationDelayedEvent; 'operation.cancelled': OperationCancelledEvent; 'operation.status_changed': OperationStatusChangedEvent
  'operation.reprioritized': OperationReprioritizedEvent; 'operation.intervention_requested': InterventionRequestedEvent; 'operation.intervention_executed': InterventionExecutedEvent
  'operation.intervention_rejected': { type: 'operation.intervention_rejected'; interventionId: string; orgId: string; targetOrgId: string; operationId: string; rejectedBy: string; rejectionReason?: string | undefined; occurredAt: Date }
  'operation.dependency_added': { type: 'operation.dependency_added'; orgId: string; operationId: string; dependsOnId: string; dependsOnOrgId: string; dependencyType: string; occurredAt: Date; actorId: string }
  'operation.dependency_removed': { type: 'operation.dependency_removed'; orgId: string; operationId: string; dependsOnId: string; occurredAt: Date; actorId: string }
  'vessel.registered': VesselRegisteredEvent; 'vessel.status_changed': VesselStatusChangedEvent; 'vessel.eta_changed': VesselEtaChangedEvent
  'vessel.arrived': VesselArrivedEvent; 'vessel.berthed': VesselBerthedEvent; 'vessel.departed': VesselDepartedEvent
  'vessel.position_updated': VesselPositionUpdatedEvent; 'port_call.announced': PortCallAnnouncedEvent
  'train.scheduled': TrainScheduledEvent; 'train.departed': TrainDepartedEvent; 'train.arrived': TrainArrivedEvent; 'train.delayed': TrainDelayedEvent; 'train.cancelled': TrainCancelledEvent
  'trip.dispatched': TripDispatchedEvent; 'trip.departed': TripDepartedEvent; 'trip.checkpoint_reached': TripCheckpointReachedEvent
  'trip.delayed': TripDelayedEvent; 'trip.arrived': TripArrivedEvent; 'trip.completed': TripCompletedEvent
  'vehicle.breakdown': VehicleBreakdownEvent; 'vehicle.position_updated': VehiclePositionUpdatedEvent
  'shipment.created': ShipmentCreatedEvent; 'shipment.status_changed': ShipmentStatusChangedEvent; 'shipment.milestone_reached': ShipmentMilestoneReachedEvent
  'shipment.exception_raised': ShipmentExceptionRaisedEvent; 'shipment.leg_added': ShipmentLegAddedEvent
  'shipment.leg_status_updated': ShipmentLegStatusUpdatedEvent; 'shipment.exception_resolved': ShipmentExceptionResolvedEvent
  'terminal.created': TerminalCreatedEvent; 'terminal.gate_created': TerminalGateCreatedEvent; 'terminal.gate_status_updated': TerminalGateStatusUpdatedEvent
  'terminal.berth_created': TerminalBerthCreatedEvent; 'terminal.crane_created': TerminalCraneCreatedEvent
  'berth.assigned': { type: 'berth.assigned'; assignmentId: string; berthId: string; orgId: string; portCallId: string; plannedStart: Date; occurredAt: Date; assignedBy: string }
  'crane.assigned': { type: 'crane.assigned'; assignmentId: string; craneId: string; orgId: string; berthId: string; portCallId: string; occurredAt: Date }
  'crane.breakdown': { type: 'crane.breakdown'; craneId: string; orgId: string; craneCode: string; reportedBy: string; reason: string; occurredAt: Date }
  'crane.restored': { type: 'crane.restored'; craneId: string; orgId: string; craneCode: string; restoredBy: string; occurredAt: Date }
  'container.announced': ContainerAnnouncedEvent; 'container.moved': ContainerMovedEvent; 'container.gate_in': ContainerGateInEvent
  'container.gate_out': ContainerGateOutEvent; 'container.discharged': ContainerDischargedEvent; 'container.held': ContainerHeldEvent; 'container.released': ContainerReleasedEvent
  'intermodal.handover_requested': HandoverRequestedEvent; 'intermodal.handover_accepted': HandoverAcceptedEvent; 'intermodal.handover_rejected': HandoverRejectedEvent
  'intermodal.handover_completed': HandoverCompletedEvent; 'intermodal.handover_cancelled': HandoverCancelledEvent
  'workforce.employee_registered': EmployeeRegisteredEvent; 'workforce.employee_status_changed': EmployeeStatusChangedEvent
  'workforce.assigned': WorkforceAssignedEvent; 'workforce.assignment_completed': WorkforceAssignmentCompletedEvent
  'asset.registered': AssetRegisteredEvent; 'asset.status_changed': AssetStatusChangedEvent; 'asset.operator_assigned': AssetOperatorAssignedEvent
  'asset.operator_returned': AssetOperatorReturnedEvent; 'asset.inspection_completed': AssetInspectionCompletedEvent; 'asset.maintenance_required': AssetMaintenanceRequiredEvent
  'maintenance.workorder_created': MaintenanceWorkOrderCreatedEvent; 'maintenance.workorder_started': MaintenanceWorkOrderStartedEvent
  'maintenance.workorder_completed': MaintenanceWorkOrderCompletedEvent; 'maintenance.workorder_closed': MaintenanceWorkOrderClosedEvent
  'maintenance.failure_reported': MaintenanceFailureReportedEvent
  'yard.container_placed': YardContainerPlacedEvent; 'yard.container_moved': YardContainerMovedEvent
  'yard.container_removed': YardContainerRemovedEvent; 'yard.slot_reserved': YardSlotReservedEvent
  'warehouse.received': WarehouseReceivedEvent; 'warehouse.putaway_completed': WarehousePutawayCompletedEvent
  'warehouse.picking_started': WarehousePickingStartedEvent; 'warehouse.dispatched': WarehouseDispatchedEvent
  'warehouse.picking_completed': WarehousePickingCompletedEvent
  'warehouse.inventory_adjusted': WarehouseInventoryAdjustedEvent; 'warehouse.cycle_count_completed': WarehouseCycleCountCompletedEvent
  'aviation.flight_scheduled': AviationFlightScheduledEvent; 'aviation.slot_confirmed': AviationSlotConfirmedEvent
  'aviation.manifest_closed': AviationManifestClosedEvent; 'aviation.load_plan_approved': AviationLoadPlanApprovedEvent
  'aviation.flight_departed': AviationFlightDepartedEvent; 'aviation.flight_arrived': AviationFlightArrivedEvent
  'aviation.flight_delayed': AviationFlightDelayedEvent; 'aviation.aog_declared': AviationAogDeclaredEvent
  'aviation.cargo_accepted': AviationCargoAcceptedEvent
}
