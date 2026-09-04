import { pgSchema, text, timestamp, integer, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { ulid } from 'ulid'
import { geometryPolygon } from '@/shared/database/types/geometry'

export const yardSchema = pgSchema('yard')

// ─── Enums ───
export const yardTypeEnum = yardSchema.enum('yard_type', [
  'IMPORT', 'EXPORT', 'TRANSSHIP', 'REEFER', 'HAZMAT', 'EMPTY',
])
export const blockTypeEnum = yardSchema.enum('block_type', [
  'IMPORT', 'EXPORT', 'REEFER', 'EMPTY', 'HAZMAT',
])
export const equipmentTypeEnum = yardSchema.enum('equipment_type', [
  'RTG', 'RMG', 'STRADDLE',
])
export const slotStatusEnum = yardSchema.enum('slot_status', [
  'EMPTY', 'OCCUPIED', 'RESERVED', 'BLOCKED',
])
export const yardMovementTypeEnum = yardSchema.enum('yard_movement_type', [
  'INBOUND', 'OUTBOUND', 'RESHUFFLE', 'SHIFT',
])

// ─── Tables ───

// Yards
export const yards = yardSchema.table('yards', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  terminalId: text('terminal_id').notNull(),  // FK to terminal.terminals
  code: text('code').notNull(),
  name: text('name').notNull(),
  boundary: geometryPolygon('boundary'),
  totalCapacityTeu: integer('total_capacity_teu'),
  type: yardTypeEnum('type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('yards_org_idx').on(t.orgId),
  uniqueIndex('yards_org_code_unique').on(t.orgId, t.code),
])

// Blocks
export const blocks = yardSchema.table('blocks', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  yardId: text('yard_id').notNull().references(() => yards.id),
  code: text('code').notNull(),
  blockType: blockTypeEnum('block_type').notNull(),
  bayCount: integer('bay_count').notNull(),
  rowCount: integer('row_count').notNull(),
  maxTier: integer('max_tier').notNull().default(5),
  equipmentType: equipmentTypeEnum('equipment_type'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('blocks_org_idx').on(t.orgId),
  index('blocks_yard_idx').on(t.yardId),
  uniqueIndex('blocks_yard_code_unique').on(t.yardId, t.code),
])

// Slots
export const slots = yardSchema.table('slots', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  blockId: text('block_id').notNull().references(() => blocks.id),
  bay: text('bay').notNull(),
  row: text('row').notNull(),
  tier: integer('tier').notNull(),
  status: slotStatusEnum('status').notNull().default('EMPTY'),
  containerId: text('container_id'),    // FK to containers.container_units (nullable)
  reservedFor: text('reserved_for'),    // container ID expected to arrive
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('slots_org_idx').on(t.orgId),
  index('slots_block_idx').on(t.blockId),
  index('slots_status_idx').on(t.orgId, t.status),
  uniqueIndex('slots_block_position_unique').on(t.blockId, t.bay, t.row, t.tier),
])

// Yard Movements
export const yardMovements = yardSchema.table('movements', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  containerId: text('container_id').notNull(),
  fromSlotId: text('from_slot_id'),     // nullable — inbound from vessel/gate
  toSlotId: text('to_slot_id').notNull().references(() => slots.id),
  movementType: yardMovementTypeEnum('movement_type').notNull(),
  equipmentId: text('equipment_id'),    // FK to assets.assets (nullable)
  operatorId: text('operator_id'),      // FK to workforce.employees (nullable)
  movedAt: timestamp('moved_at', { withTimezone: true }).notNull(),
}, (t) => [
  index('yard_movements_org_idx').on(t.orgId),
  index('yard_movements_container_idx').on(t.containerId),
  index('yard_movements_time_idx').on(t.orgId, t.movedAt),
])
