import { pgSchema, text, timestamp, date, numeric, integer, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { ulid } from 'ulid'
import { geometryPoint, geometryPolygon } from '@/shared/database/types/geometry'

export const warehouseSchema = pgSchema('warehouse')

// ─── Enums ───
export const warehouseTypeEnum = warehouseSchema.enum('warehouse_type', [
  'GENERAL', 'BONDED', 'COLD_CHAIN', 'HAZMAT', 'CONSOLIDATION',
])
export const receivingStatusEnum = warehouseSchema.enum('receiving_status', [
  'PENDING', 'IN_PROGRESS', 'COMPLETED', 'DISCREPANCY',
])
export const inventoryConditionEnum = warehouseSchema.enum('inventory_condition', [
  'GOOD', 'DAMAGED', 'QUARANTINE',
])
export const pickingStatusEnum = warehouseSchema.enum('picking_status', [
  'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED',
])
export const cycleCountTypeEnum = warehouseSchema.enum('cycle_count_type', [
  'FULL', 'PARTIAL', 'SPOT',
])
export const cycleCountStatusEnum = warehouseSchema.enum('cycle_count_status', [
  'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED',
])

// ─── Tables ───

// Warehouses
export const warehouses = warehouseSchema.table('warehouses', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  location: geometryPoint('location'),
  boundary: geometryPolygon('boundary'),
  type: warehouseTypeEnum('type').notNull(),
  totalAreaM2: numeric('total_area_m2'),
  usableAreaM2: numeric('usable_area_m2'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('warehouses_org_idx').on(t.orgId),
  uniqueIndex('warehouses_org_code_unique').on(t.orgId, t.code),
])

// Receivings
export const receivings = warehouseSchema.table('receivings', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  warehouseId: text('warehouse_id').notNull().references(() => warehouses.id),
  shipmentId: text('shipment_id'),     // FK to shipments (nullable)
  referenceNumber: text('reference_number').notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true }),
  receivedBy: text('received_by'),     // FK to workforce.employees (nullable)
  status: receivingStatusEnum('status').notNull().default('PENDING'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('receivings_org_idx').on(t.orgId),
  index('receivings_warehouse_idx').on(t.orgId, t.warehouseId),
  index('receivings_status_idx').on(t.orgId, t.status),
])

// Inventory
export const inventory = warehouseSchema.table('inventory', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  warehouseId: text('warehouse_id').notNull().references(() => warehouses.id),
  sku: text('sku').notNull(),
  description: text('description'),
  quantityOnHand: numeric('quantity_on_hand').notNull().default('0'),
  quantityReserved: numeric('quantity_reserved').notNull().default('0'),
  locationId: text('location_id'),     // storage location code
  batchNumber: text('batch_number'),
  expiryDate: date('expiry_date'),
  condition: inventoryConditionEnum('condition').notNull().default('GOOD'),
  lastCountedAt: timestamp('last_counted_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('inventory_org_idx').on(t.orgId),
  index('inventory_warehouse_idx').on(t.orgId, t.warehouseId),
  index('inventory_sku_idx').on(t.orgId, t.sku),
])

// Pickings
export const pickings = warehouseSchema.table('pickings', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  warehouseId: text('warehouse_id').notNull().references(() => warehouses.id),
  orderId: text('order_id'),
  pickerId: text('picker_id'),         // FK to workforce.employees (nullable)
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  status: pickingStatusEnum('status').notNull().default('PENDING'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('pickings_org_idx').on(t.orgId),
  index('pickings_warehouse_idx').on(t.orgId, t.warehouseId),
  index('pickings_status_idx').on(t.orgId, t.status),
])

// Dispatches
export const dispatches = warehouseSchema.table('dispatches', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  warehouseId: text('warehouse_id').notNull().references(() => warehouses.id),
  shipmentId: text('shipment_id'),     // nullable
  tripId: text('trip_id'),             // FK to road.trips (nullable)
  dispatchedAt: timestamp('dispatched_at', { withTimezone: true }).notNull(),
  dispatchedBy: text('dispatched_by'),
  vehicleId: text('vehicle_id'),       // FK to road.vehicles (nullable)
  driverId: text('driver_id'),         // FK to road.drivers (nullable)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('dispatches_org_idx').on(t.orgId),
  index('dispatches_warehouse_idx').on(t.orgId, t.warehouseId),
])

// Cycle Counts
export const cycleCounts = warehouseSchema.table('cycle_counts', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  warehouseId: text('warehouse_id').notNull().references(() => warehouses.id),
  countType: cycleCountTypeEnum('count_type').notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  conductedBy: text('conducted_by'),
  itemsCounted: integer('items_counted'),
  discrepanciesFound: integer('discrepancies_found'),
  status: cycleCountStatusEnum('status').notNull().default('SCHEDULED'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('cycle_counts_org_idx').on(t.orgId),
  index('cycle_counts_warehouse_idx').on(t.orgId, t.warehouseId),
  index('cycle_counts_status_idx').on(t.orgId, t.status),
])
