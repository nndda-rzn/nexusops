import {
  pgSchema, text, timestamp, boolean, integer, numeric,
  index, uniqueIndex,
} from 'drizzle-orm/pg-core'
import { ulid } from 'ulid'

export const containersSchema = pgSchema('containers')

// D-03 FIX: use containersSchema.enum() — enums created in 'containers' schema
export const containerTypeEnum = containersSchema.enum('container_type', [
  'DRY', 'REEFER', 'OPEN_TOP', 'FLAT_RACK', 'TANK',
])

export const containerSizeEnum = containersSchema.enum('container_size', [
  '20FT', '40FT', '40FT_HC', '45FT',
])

export const containerStatusEnum = containersSchema.enum('container_status', [
  'ANNOUNCED', 'ON_VESSEL', 'DISCHARGED', 'IN_TRANSFER',
  'IN_YARD', 'RELEASED', 'GATE_OUT',
  'CUSTOMS_HOLD', 'DAMAGED', 'INSPECTION', 'TRANSSHIPMENT',
])

export const movementTypeEnum = containersSchema.enum('movement_type', [
  'DISCHARGE', 'LOAD', 'YARD_MOVE', 'GATE_IN', 'GATE_OUT', 'RESHUFFLE',
])

export const holdTypeEnum = containersSchema.enum('hold_type', [
  'CUSTOMS_HOLD', 'PAYMENT_HOLD', 'DAMAGE_HOLD', 'INSPECTION_HOLD',
])

export const holdStatusEnum = containersSchema.enum('hold_status', ['ACTIVE', 'RELEASED'])

// ─────────────────────────────────────────
// Tables
// ─────────────────────────────────────────

export const containerUnits = containersSchema.table('units', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  containerNumber: text('container_number').notNull(),
  type: containerTypeEnum('type').notNull(),
  size: containerSizeEnum('size').notNull(),
  status: containerStatusEnum('status').notNull().default('ANNOUNCED'),
  currentLocationId: text('current_location_id'),
  currentLocationType: text('current_location_type'),
  shipmentId: text('shipment_id'),
  vesselId: text('vessel_id'),
  tareWeight: numeric('tare_weight'),
  maxPayload: numeric('max_payload'),
  sealNumber: text('seal_number'),
  isHazmat: boolean('is_hazmat').notNull().default(false),
  hazmatClass: text('hazmat_class'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('containers_org_id_idx').on(t.orgId),
  index('containers_org_status_idx').on(t.orgId, t.status),
  index('containers_shipment_idx').on(t.orgId, t.shipmentId),
  uniqueIndex('containers_number_org_unique').on(t.orgId, t.containerNumber),
])

export const containerMovements = containersSchema.table('movements', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  containerId: text('container_id').notNull(),
  movementType: movementTypeEnum('movement_type').notNull(),
  fromLocationType: text('from_location_type'),
  fromLocationId: text('from_location_id'),
  toLocationType: text('to_location_type').notNull(),
  toLocationId: text('to_location_id').notNull(),
  equipmentId: text('equipment_id'),
  operatorId: text('operator_id'),
  movedAt: timestamp('moved_at', { withTimezone: true }).notNull().defaultNow(),
  notes: text('notes'),
  isException: boolean('is_exception').notNull().default(false),
  verifiedBy: text('verified_by'),
}, (t) => [
  index('movements_container_idx').on(t.orgId, t.containerId),
  index('movements_moved_at_idx').on(t.orgId, t.movedAt),
])

export const containerInspections = containersSchema.table('inspections', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  containerId: text('container_id').notNull(),
  inspectionType: text('inspection_type').notNull(),
  result: text('result').notNull(),
  findings: text('findings'),
  photoIds: text('photo_ids').array(),
  inspectedAt: timestamp('inspected_at', { withTimezone: true }).notNull().defaultNow(),
  inspectorId: text('inspector_id').notNull(),
  nextInspectionDate: timestamp('next_inspection_date', { withTimezone: true }),
  workOrderId: text('work_order_id'),
}, (t) => [
  index('inspections_container_idx').on(t.orgId, t.containerId),
])

export const containerHolds = containersSchema.table('holds', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  containerId: text('container_id').notNull(),
  holdType: holdTypeEnum('hold_type').notNull(),
  reason: text('reason').notNull(),
  notes: text('notes'),
  placedBy: text('placed_by').notNull(),
  placedAt: timestamp('placed_at', { withTimezone: true }).notNull().defaultNow(),
  releasedBy: text('released_by'),
  releasedAt: timestamp('released_at', { withTimezone: true }),
  status: holdStatusEnum('status').notNull().default('ACTIVE'),
}, (t) => [
  index('holds_container_idx').on(t.orgId, t.containerId),
  index('holds_status_idx').on(t.orgId, t.status),
])
