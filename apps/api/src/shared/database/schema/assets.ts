import { pgSchema, text, timestamp, integer, numeric, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { ulid } from 'ulid'
import { geometryPoint } from '@/shared/database/types/geometry'

// ─────────────────────────────────────────
// Schema
// ─────────────────────────────────────────
export const assetsSchema = pgSchema('assets')

// ─────────────────────────────────────────
// Enums
// ─────────────────────────────────────────
export const assetStatusEnum = assetsSchema.enum('asset_status', [
  'ACTIVE', 'IDLE', 'ASSIGNED_OUT', 'MAINTENANCE', 'BREAKDOWN',
  'INSPECTION', 'DECOMMISSIONED', 'DISPOSED',
])

export const assetConditionEnum = assetsSchema.enum('asset_condition', [
  'EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL',
])

export const rateUnitEnum = assetsSchema.enum('rate_unit', [
  'PER_MOVE', 'PER_HOUR', 'PER_KM', 'PER_DAY',
])

export const operatorAssignmentStatusEnum = assetsSchema.enum('operator_assignment_status', [
  'ACTIVE', 'COMPLETED', 'CANCELLED',
])

export const locationTypeEnum = assetsSchema.enum('location_type', [
  'TERMINAL', 'YARD', 'WAREHOUSE', 'WORKSHOP', 'RAIL_DEPOT', 'AIRPORT', 'EXTERNAL',
])

export const inspectionTypeEnum = assetsSchema.enum('inspection_type', [
  'ROUTINE', 'PRE_OPERATION', 'POST_OPERATION', 'ANNUAL', 'SPECIAL',
])

export const inspectionResultEnum = assetsSchema.enum('inspection_result', [
  'PASS', 'FAIL', 'CONDITIONAL',
])

// ─────────────────────────────────────────
// Tables
// ─────────────────────────────────────────

// Asset Categories (hierarchical)
export const categories = assetsSchema.table('categories', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  parentCategoryId: text('parent_category_id'),
  maintenanceIntervalDays: integer('maintenance_interval_days'),
  inspectionRequired: boolean('inspection_required').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('categories_org_idx').on(t.orgId),
  uniqueIndex('categories_org_code_unique').on(t.orgId, t.code),
])

// Assets
export const assets = assetsSchema.table('assets', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),                  // owner org
  assetNumber: text('asset_number').notNull(),
  categoryId: text('category_id').references(() => categories.id),
  name: text('name').notNull(),
  serialNumber: text('serial_number'),
  manufacturer: text('manufacturer'),
  model: text('model'),
  yearManufactured: integer('year_manufactured'),
  yearAcquired: integer('year_acquired'),
  acquisitionCost: numeric('acquisition_cost'),
  currentValue: numeric('current_value'),
  ownerOrgId: text('owner_org_id').notNull(),
  operatorOrgId: text('operator_org_id'),           // nullable — assigned operator
  status: assetStatusEnum('status').notNull().default('ACTIVE'),
  condition: assetConditionEnum('condition').notNull().default('GOOD'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('assets_org_idx').on(t.orgId),
  index('assets_owner_idx').on(t.ownerOrgId),
  index('assets_status_idx').on(t.orgId, t.status),
  uniqueIndex('assets_org_number_unique').on(t.orgId, t.assetNumber),
])

// Operator Assignments (cross-entity)
export const operatorAssignments = assetsSchema.table('operator_assignments', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  assetId: text('asset_id').notNull().references(() => assets.id),
  ownerOrgId: text('owner_org_id').notNull(),
  operatorOrgId: text('operator_org_id').notNull(),
  assignmentStart: timestamp('assignment_start', { withTimezone: true }).notNull(),
  assignmentEnd: timestamp('assignment_end', { withTimezone: true }),
  internalRate: numeric('internal_rate'),
  rateUnit: rateUnitEnum('rate_unit'),
  status: operatorAssignmentStatusEnum('status').notNull().default('ACTIVE'),
  approvedBy: text('approved_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('operator_assignments_asset_idx').on(t.assetId),
  index('operator_assignments_owner_idx').on(t.ownerOrgId),
  index('operator_assignments_operator_idx').on(t.operatorOrgId),
  index('operator_assignments_status_idx').on(t.status),
])

// Lifecycle Events
export const lifecycleEvents = assetsSchema.table('lifecycle_events', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  assetId: text('asset_id').notNull().references(() => assets.id),
  eventType: text('event_type').notNull(),
  description: text('description'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  actorId: text('actor_id'),
}, (t) => [
  index('lifecycle_events_org_idx').on(t.orgId),
  index('lifecycle_events_asset_idx').on(t.assetId),
])

// Asset Locations (tracking)
export const assetLocations = assetsSchema.table('locations', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  assetId: text('asset_id').notNull().references(() => assets.id),
  locationType: locationTypeEnum('location_type').notNull(),
  locationId: text('location_id'),
  position: geometryPoint('position'),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
}, (t) => [
  index('asset_locations_asset_idx').on(t.assetId),
  index('asset_locations_time_idx').on(t.assetId, t.recordedAt),
])

// Inspections
export const inspections = assetsSchema.table('inspections', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  assetId: text('asset_id').notNull().references(() => assets.id),
  inspectionType: inspectionTypeEnum('inspection_type').notNull(),
  result: inspectionResultEnum('result').notNull(),
  findings: text('findings'),
  inspectedAt: timestamp('inspected_at', { withTimezone: true }).notNull(),
  inspectorId: text('inspector_id'),
  nextInspectionDate: text('next_inspection_date'),
  workOrderId: text('work_order_id'),   // FK to maintenance.work_orders (Phase 3 Step 2)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('inspections_org_idx').on(t.orgId),
  index('inspections_asset_idx').on(t.assetId),
  index('inspections_result_idx').on(t.orgId, t.result),
])
