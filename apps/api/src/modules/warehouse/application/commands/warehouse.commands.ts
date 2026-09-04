import { warehouses, receivings, inventory, pickings, dispatches, cycleCounts } from '@/shared/database/schema/warehouse'
import { generateId } from '@/shared/ids'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

// ─── Warehouse ───
export interface CreateWarehouseCommand {
  orgId: string; code: string; name: string
  type: 'GENERAL' | 'BONDED' | 'COLD_CHAIN' | 'HAZMAT' | 'CONSOLIDATION'
  totalAreaM2?: string | undefined; usableAreaM2?: string | undefined
  location?: string | undefined; boundary?: string | undefined
}
export async function createWarehouseCommand(cmd: CreateWarehouseCommand, db: DbContext): Promise<{ id: string }> {
  const id = generateId(); const now = new Date()
  await db.insert(warehouses).values({
    id, orgId: cmd.orgId, code: cmd.code, name: cmd.name, type: cmd.type,
    totalAreaM2: cmd.totalAreaM2, usableAreaM2: cmd.usableAreaM2,
    location: cmd.location, boundary: cmd.boundary,
    createdAt: now, updatedAt: now,
  })
  return { id }
}

// ─── Receiving ───
export interface ReceiveCargoCommand {
  orgId: string; warehouseId: string; referenceNumber: string
  shipmentId?: string | undefined; receivedBy?: string | undefined
}
export async function receiveCargoCommand(cmd: ReceiveCargoCommand, db: DbContext): Promise<{ id: string }> {
  const id = generateId(); const now = new Date()
  await db.insert(receivings).values({
    id, orgId: cmd.orgId, warehouseId: cmd.warehouseId,
    shipmentId: cmd.shipmentId, referenceNumber: cmd.referenceNumber,
    receivedAt: now, receivedBy: cmd.receivedBy,
    status: 'IN_PROGRESS', createdAt: now, updatedAt: now,
  })
  await eventBus.emit('warehouse.received', {
    type: 'warehouse.received',
    warehouseId: cmd.warehouseId, orgId: cmd.orgId,
    receivingId: id, occurredAt: now,
  })
  return { id }
}

// ─── Inventory ───
export interface AdjustInventoryCommand {
  orgId: string; warehouseId: string; sku: string; description?: string | undefined
  quantityOnHand: string; locationId?: string | undefined; batchNumber?: string | undefined
  expiryDate?: string | undefined; condition?: 'GOOD' | 'DAMAGED' | 'QUARANTINE' | undefined
}
export async function adjustInventoryCommand(cmd: AdjustInventoryCommand, db: DbContext): Promise<{ id: string }> {
  const id = generateId()
  await db.insert(inventory).values({
    id, orgId: cmd.orgId, warehouseId: cmd.warehouseId,
    sku: cmd.sku, description: cmd.description,
    quantityOnHand: cmd.quantityOnHand, quantityReserved: '0',
    locationId: cmd.locationId, batchNumber: cmd.batchNumber,
    expiryDate: cmd.expiryDate, condition: cmd.condition ?? 'GOOD',
    updatedAt: new Date(),
  })
  await eventBus.emit('warehouse.inventory_adjusted', {
    type: 'warehouse.inventory_adjusted',
    warehouseId: cmd.warehouseId, orgId: cmd.orgId,
    sku: cmd.sku, occurredAt: new Date(),
  })
  return { id }
}

// ─── Picking ───
export interface StartPickingCommand {
  orgId: string; warehouseId: string; orderId?: string | undefined; pickerId?: string | undefined
}
export async function startPickingCommand(cmd: StartPickingCommand, db: DbContext): Promise<{ id: string }> {
  const id = generateId(); const now = new Date()
  await db.insert(pickings).values({
    id, orgId: cmd.orgId, warehouseId: cmd.warehouseId,
    orderId: cmd.orderId, pickerId: cmd.pickerId,
    startedAt: now, status: 'IN_PROGRESS',
    createdAt: now, updatedAt: now,
  })
  await eventBus.emit('warehouse.picking_started', {
    type: 'warehouse.picking_started',
    warehouseId: cmd.warehouseId, orgId: cmd.orgId,
    pickingId: id, occurredAt: now,
  })
  return { id }
}

// ─── Dispatch ───
export interface DispatchCargoCommand {
  orgId: string; warehouseId: string; dispatchedBy?: string | undefined
  shipmentId?: string | undefined; tripId?: string | undefined
  vehicleId?: string | undefined; driverId?: string | undefined
}
export async function dispatchCargoCommand(cmd: DispatchCargoCommand, db: DbContext): Promise<{ id: string }> {
  const id = generateId(); const now = new Date()
  await db.insert(dispatches).values({
    id, orgId: cmd.orgId, warehouseId: cmd.warehouseId,
    shipmentId: cmd.shipmentId, tripId: cmd.tripId,
    dispatchedAt: now, dispatchedBy: cmd.dispatchedBy,
    vehicleId: cmd.vehicleId, driverId: cmd.driverId,
    createdAt: now,
  })
  await eventBus.emit('warehouse.dispatched', {
    type: 'warehouse.dispatched',
    warehouseId: cmd.warehouseId, orgId: cmd.orgId,
    dispatchId: id, occurredAt: now,
  })
  return { id }
}

// ─── Cycle Count ───
export interface ConductCycleCountCommand {
  orgId: string; warehouseId: string; cycleCountId: string
  itemsCounted: number; discrepanciesFound: number; conductedBy?: string | undefined
}
export async function conductCycleCountCommand(cmd: ConductCycleCountCommand, db: DbContext): Promise<void> {
  const { eq } = await import('drizzle-orm')
  const now = new Date()
  await db.update(cycleCounts)
    .set({
      status: 'COMPLETED', completedAt: now,
      itemsCounted: cmd.itemsCounted,
      discrepanciesFound: cmd.discrepanciesFound,
      conductedBy: cmd.conductedBy, updatedAt: now,
    })
    .where(eq(cycleCounts.id, cmd.cycleCountId))
  await eventBus.emit('warehouse.cycle_count_completed', {
    type: 'warehouse.cycle_count_completed',
    warehouseId: cmd.warehouseId, orgId: cmd.orgId,
    cycleCountId: cmd.cycleCountId, occurredAt: now,
  })
}

export interface CreateCycleCountCommand {
  orgId: string; warehouseId: string
  countType: 'FULL' | 'PARTIAL' | 'SPOT'; scheduledAt?: Date | undefined
}
export async function createCycleCountCommand(cmd: CreateCycleCountCommand, db: DbContext): Promise<{ id: string }> {
  const id = generateId(); const now = new Date()
  await db.insert(cycleCounts).values({
    id, orgId: cmd.orgId, warehouseId: cmd.warehouseId,
    countType: cmd.countType, scheduledAt: cmd.scheduledAt,
    status: 'SCHEDULED', createdAt: now, updatedAt: now,
  })
  return { id }
}
