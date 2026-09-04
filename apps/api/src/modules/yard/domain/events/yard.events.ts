export interface YardContainerPlacedEvent {
  type: 'yard.container_placed'
  yardId: string; orgId: string; containerId: string; slotId: string; occurredAt: Date
}
export interface YardContainerMovedEvent {
  type: 'yard.container_moved'
  yardId: string; orgId: string; containerId: string; fromSlotId?: string; toSlotId: string; occurredAt: Date
}
export interface YardContainerRemovedEvent {
  type: 'yard.container_removed'
  yardId: string; orgId: string; containerId: string; slotId: string; occurredAt: Date
}
export interface YardSlotReservedEvent {
  type: 'yard.slot_reserved'
  orgId: string; slotId: string; reservedFor: string; occurredAt: Date
}
