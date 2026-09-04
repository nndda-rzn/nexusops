import { pgSchema, text, timestamp, date, numeric, integer, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { ulid } from 'ulid'

export const maintenanceSchema = pgSchema('maintenance')

// ─── Enums ───
export const workOrderTypeEnum = maintenanceSchema.enum('work_order_type', [
  'PREVENTIVE', 'CORRECTIVE', 'INSPECTION', 'EMERGENCY',
])
export const workOrderPriorityEnum = maintenanceSchema.enum('work_order_priority', [
  'LOW', 'NORMAL', 'HIGH', 'CRITICAL',
])
export const workOrderStatusEnum = maintenanceSchema.enum('work_order_status', [
  'DRAFT', 'APPROVED', 'SCHEDULED', 'ASSIGNED', 'IN_PROGRESS',
  'PENDING_PARTS', 'COMPLETED', 'CLOSED',
])
export const maintenancePlanTypeEnum = maintenanceSchema.enum('maintenance_plan_type', [
  'TIME_BASED', 'USAGE_BASED', 'CONDITION_BASED',
])
export const maintenancePlanStatusEnum = maintenanceSchema.enum('maintenance_plan_status', [
  'ACTIVE', 'PAUSED', 'ARCHIVED',
])
export const failureSeverityEnum = maintenanceSchema.enum('failure_severity', [
  'MINOR', 'MAJOR', 'CRITICAL',
])

// ─── Tables ───

// Work Orders
export const workOrders = maintenanceSchema.table('work_orders', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  workOrderNumber: text('work_order_number').notNull(),
  assetId: text('asset_id').notNull(),          // FK to assets.assets
  type: workOrderTypeEnum('type').notNull(),
  priority: workOrderPriorityEnum('priority').notNull().default('NORMAL'),
  title: text('title').notNull(),
  description: text('description'),
  status: workOrderStatusEnum('status').notNull().default('DRAFT'),
  assignedTo: text('assigned_to'),              // FK to workforce.employees
  approvedBy: text('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  scheduledStart: timestamp('scheduled_start', { withTimezone: true }),
  scheduledEnd: timestamp('scheduled_end', { withTimezone: true }),
  actualStart: timestamp('actual_start', { withTimezone: true }),
  actualEnd: timestamp('actual_end', { withTimezone: true }),
  estimatedDurationHours: numeric('estimated_duration_hours'),
  actualDurationHours: numeric('actual_duration_hours'),
  laborCost: numeric('labor_cost'),
  partsCost: numeric('parts_cost'),
  totalCost: numeric('total_cost'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('work_orders_org_idx').on(t.orgId),
  index('work_orders_asset_idx').on(t.orgId, t.assetId),
  index('work_orders_status_idx').on(t.orgId, t.status),
  uniqueIndex('work_orders_org_number_unique').on(t.orgId, t.workOrderNumber),
])

// Maintenance Plans
export const maintenancePlans = maintenanceSchema.table('maintenance_plans', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  assetId: text('asset_id').notNull(),
  planType: maintenancePlanTypeEnum('plan_type').notNull(),
  intervalDays: integer('interval_days'),
  intervalHours: numeric('interval_hours'),
  tasks: jsonb('tasks'),
  estimatedDurationHours: numeric('estimated_duration_hours'),
  nextDueDate: date('next_due_date'),
  lastCompletedAt: timestamp('last_completed_at', { withTimezone: true }),
  status: maintenancePlanStatusEnum('status').notNull().default('ACTIVE'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('maintenance_plans_org_idx').on(t.orgId),
  index('maintenance_plans_asset_idx').on(t.orgId, t.assetId),
  index('maintenance_plans_status_idx').on(t.orgId, t.status),
])

// Failures
export const failures = maintenanceSchema.table('failures', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  assetId: text('asset_id').notNull(),
  failureType: text('failure_type').notNull(),
  description: text('description').notNull(),
  severity: failureSeverityEnum('severity').notNull(),
  detectedAt: timestamp('detected_at', { withTimezone: true }).notNull(),
  detectedBy: text('detected_by'),
  workOrderId: text('work_order_id'),
  downtimeStart: timestamp('downtime_start', { withTimezone: true }),
  downtimeEnd: timestamp('downtime_end', { withTimezone: true }),
  downtimeMinutes: integer('downtime_minutes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('failures_org_idx').on(t.orgId),
  index('failures_asset_idx').on(t.orgId, t.assetId),
  index('failures_severity_idx').on(t.orgId, t.severity),
])

// Spare Parts
export const spareParts = maintenanceSchema.table('spare_parts', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  partNumber: text('part_number').notNull(),
  name: text('name').notNull(),
  quantityOnHand: numeric('quantity_on_hand').notNull().default('0'),
  quantityReserved: numeric('quantity_reserved').notNull().default('0'),
  reorderPoint: numeric('reorder_point').notNull().default('0'),
  unitCost: numeric('unit_cost'),
  supplier: text('supplier'),
  leadTimeDays: integer('lead_time_days'),
  location: text('location'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('spare_parts_org_idx').on(t.orgId),
  uniqueIndex('spare_parts_org_number_unique').on(t.orgId, t.partNumber),
])

// Work Order Parts
export const workOrderParts = maintenanceSchema.table('work_order_parts', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  workOrderId: text('work_order_id').notNull().references(() => workOrders.id),
  sparePartId: text('spare_part_id').notNull().references(() => spareParts.id),
  quantityUsed: numeric('quantity_used').notNull(),
  unitCost: numeric('unit_cost'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('work_order_parts_org_idx').on(t.orgId),
  index('work_order_parts_wo_idx').on(t.workOrderId),
])
