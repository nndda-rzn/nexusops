// ─────────────────────────────────────────
// EventMap — Complete Domain Event Type Registry
// ─────────────────────────────────────────
// Q-01 FIX: Typed EventMap ensures compile-time safety for emit() and on().
// EventMap type is defined in event-registry.ts to keep this file under limit.
// ─────────────────────────────────────────

// Re-export EventMap from registry
export type { EventMap } from '@/shared/events/event-registry'

// Re-export inline event types for backward compatibility
export type {
  HandoverRequestedEvent, HandoverAcceptedEvent, HandoverRejectedEvent,
  HandoverCompletedEvent, HandoverCancelledEvent,
  ShipmentCreatedEvent, ShipmentStatusChangedEvent,
  ShipmentMilestoneReachedEvent, ShipmentExceptionRaisedEvent,
  ContainerAnnouncedEvent, ContainerMovedEvent, ContainerGateInEvent,
  ContainerGateOutEvent, ContainerDischargedEvent, ContainerHeldEvent,
  ContainerReleasedEvent, VehiclePositionUpdatedEvent,
} from '@/shared/events/event-types'
