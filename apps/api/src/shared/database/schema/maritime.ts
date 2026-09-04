import { pgSchema, text, timestamp, numeric, integer, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { ulid } from 'ulid'
import { geometryPoint } from '@/shared/database/types/geometry'

// ─────────────────────────────────────────
// Schema
// ─────────────────────────────────────────
export const maritimeSchema = pgSchema('maritime')

// ─────────────────────────────────────────
// Enums
// ─────────────────────────────────────────
export const vesselTypeEnum = maritimeSchema.enum('vessel_type', [
  'CONTAINER', 'BULK', 'TANKER', 'RORO', 'GENERAL_CARGO', 'LNG', 'LPG',
])

export const vesselStatusEnum = maritimeSchema.enum('vessel_status', [
  'ACTIVE', 'IN_VOYAGE', 'MAINTENANCE', 'LAID_UP',
])

export const voyageStatusEnum = maritimeSchema.enum('voyage_status', [
  'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED',
])

export const portCallStatusEnum = maritimeSchema.enum('port_call_status', [
  'ANNOUNCED',
  'ETA_CONFIRMED',
  'PILOTAGE_REQUESTED',
  'PILOTAGE_ASSIGNED',
  'ARRIVED_ANCHORAGE',
  'BERTHING',
  'BERTHED',
  'OPERATIONS',
  'OPERATIONS_COMPLETED',
  'UNBERTHING',
  'DEPARTED',
  'CANCELLED',
])

export const maritimeBerthAssignmentStatusEnum = maritimeSchema.enum('berth_assignment_status', [
  'PLANNED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED',
])

export const pilotAssignmentTypeEnum = maritimeSchema.enum('pilot_assignment_type', [
  'INBOUND', 'OUTBOUND',
])

export const pilotAssignmentStatusEnum = maritimeSchema.enum('pilot_assignment_status', [
  'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED',
])

// ─────────────────────────────────────────
// Tables
// ─────────────────────────────────────────

// Vessels
export const vessels = maritimeSchema.table('vessels', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  imoNumber: text('imo_number').notNull(),
  mmsi: text('mmsi'),
  name: text('name').notNull(),
  type: vesselTypeEnum('type').notNull(),
  flag: text('flag'),
  grossTonnage: numeric('gross_tonnage'),
  loa: numeric('loa'),
  beam: numeric('beam'),
  maxDraft: numeric('max_draft'),
  teuCapacity: integer('teu_capacity'),
  owner: text('owner'),
  operator: text('operator'),
  status: vesselStatusEnum('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('vessels_org_id_idx').on(t.orgId),
  index('vessels_org_status_idx').on(t.orgId, t.status),
  uniqueIndex('vessels_org_imo_unique').on(t.orgId, t.imoNumber),
])

// Voyages
export const voyages = maritimeSchema.table('voyages', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  voyageNumber: text('voyage_number').notNull(),
  vesselId: text('vessel_id').notNull().references(() => vessels.id),
  serviceName: text('service_name'),
  departurePortId: text('departure_port_id'),  // FK to shared_master.ports
  destinationPortId: text('destination_port_id'),  // FK to shared_master.ports
  status: voyageStatusEnum('status').notNull().default('PLANNED'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('voyages_org_id_idx').on(t.orgId),
  index('voyages_vessel_idx').on(t.orgId, t.vesselId),
  uniqueIndex('voyages_org_number_unique').on(t.orgId, t.voyageNumber),
])

// Port Calls
export const portCalls = maritimeSchema.table('port_calls', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  voyageId: text('voyage_id').notNull().references(() => voyages.id),
  portId: text('port_id'),  // FK to shared_master.ports
  eta: timestamp('eta', { withTimezone: true }),
  etb: timestamp('etb', { withTimezone: true }),
  etd: timestamp('etd', { withTimezone: true }),
  ata: timestamp('ata', { withTimezone: true }),
  atb: timestamp('atb', { withTimezone: true }),
  atd: timestamp('atd', { withTimezone: true }),
  status: portCallStatusEnum('status').notNull().default('ANNOUNCED'),
  agentId: text('agent_id'),
  delayReason: text('delay_reason'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('port_calls_org_id_idx').on(t.orgId),
  index('port_calls_org_eta_idx').on(t.orgId, t.eta),
  index('port_calls_voyage_idx').on(t.orgId, t.voyageId),
  index('port_calls_status_idx').on(t.orgId, t.status),
])

// Berth Assignments (maritime)
export const maritimeBerthAssignments = maritimeSchema.table('berth_assignments', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  portCallId: text('port_call_id').notNull().references(() => portCalls.id),
  berthId: text('berth_id').notNull(),  // FK to terminal.berths
  plannedStart: timestamp('planned_start', { withTimezone: true }).notNull(),
  plannedEnd: timestamp('planned_end', { withTimezone: true }).notNull(),
  actualStart: timestamp('actual_start', { withTimezone: true }),
  actualEnd: timestamp('actual_end', { withTimezone: true }),
  status: maritimeBerthAssignmentStatusEnum('status').notNull().default('PLANNED'),
  assignedBy: text('assigned_by').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('maritime_berth_assignments_org_idx').on(t.orgId),
  index('maritime_berth_assignments_port_call_idx').on(t.orgId, t.portCallId),
  index('maritime_berth_assignments_status_idx').on(t.orgId, t.status),
])

// Pilot Assignments
export const pilotAssignments = maritimeSchema.table('pilot_assignments', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  portCallId: text('port_call_id').notNull().references(() => portCalls.id),
  pilotId: text('pilot_id'),  // FK to workforce.employees (Phase 3) — nullable
  type: pilotAssignmentTypeEnum('type').notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  actualAt: timestamp('actual_at', { withTimezone: true }),
  status: pilotAssignmentStatusEnum('status').notNull().default('SCHEDULED'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('pilot_assignments_org_idx').on(t.orgId),
  index('pilot_assignments_port_call_idx').on(t.portCallId),
])

// Tug Assignments
export const tugAssignments = maritimeSchema.table('tug_assignments', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  portCallId: text('port_call_id').notNull().references(() => portCalls.id),
  tugAssetId: text('tug_asset_id'),  // FK to assets.assets (Phase 3) — nullable
  type: pilotAssignmentTypeEnum('type').notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  actualAt: timestamp('actual_at', { withTimezone: true }),
  status: pilotAssignmentStatusEnum('status').notNull().default('SCHEDULED'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('tug_assignments_org_idx').on(t.orgId),
  index('tug_assignments_port_call_idx').on(t.portCallId),
])

// Vessel Positions (AIS — high volume, no org_id — RLS via vessels)
export const vesselPositions = maritimeSchema.table('vessel_positions', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  vesselId: text('vessel_id').notNull().references(() => vessels.id),
  position: geometryPoint('position').notNull(),
  speed: numeric('speed'),
  heading: numeric('heading'),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
}, (t) => [
  index('vessel_positions_vessel_time_idx').on(t.vesselId, t.recordedAt),
])
