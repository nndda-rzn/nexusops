export interface WarehouseReceivedEvent { type: 'warehouse.received'; warehouseId: string; orgId: string; receivingId: string; occurredAt: Date }
export interface WarehousePutawayCompletedEvent { type: 'warehouse.putaway_completed'; warehouseId: string; orgId: string; receivingId: string; occurredAt: Date }
export interface WarehousePickingStartedEvent { type: 'warehouse.picking_started'; warehouseId: string; orgId: string; pickingId: string; occurredAt: Date }
export interface WarehousePickingCompletedEvent { type: 'warehouse.picking_completed'; warehouseId: string; orgId: string; pickingId: string; occurredAt: Date }
export interface WarehouseDispatchedEvent { type: 'warehouse.dispatched'; warehouseId: string; orgId: string; dispatchId: string; occurredAt: Date }
export interface WarehouseInventoryAdjustedEvent { type: 'warehouse.inventory_adjusted'; warehouseId: string; orgId: string; sku: string; occurredAt: Date }
export interface WarehouseCycleCountCompletedEvent { type: 'warehouse.cycle_count_completed'; warehouseId: string; orgId: string; cycleCountId: string; occurredAt: Date }
