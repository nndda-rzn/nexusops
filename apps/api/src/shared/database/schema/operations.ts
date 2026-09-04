import {
  pgSchema,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { ulid } from 'ulid'

// ─────────────────────────────────────────
// Schema
// ─────────────────────────────────────────
export const operationsSchema = pgSchema('operations')

// ─────────────────────────────────────────
// Enums — D-03 FIX: use operationsSchema.enum() so enums are created
// in the 'operations' schema, not the public schema.
// ─────────────────────────────────────────
export const operationTypeEnum = operationsSchema.enum('operation_type', [
  'VESSEL_ARRIVAL', 'VESSEL_BERTHING', 'VESSEL_UNBERTHING',
  'CONTAINER_DISCHARGE', 'CONTAINER_LOADING', 'YARD_MOVE',
  'TRAIN_ARRIVAL', 'TRAIN_DEPARTURE',
  'TRUCK_GATE_IN', 'TRUCK_GATE_OUT',
  'WAREHOUSE_RECEIVING', 'WAREHOUSE_DISPATCH',
  'FLIGHT_ARRIVAL', 'FLIGHT_DEPARTURE', 'CARGO_LOADING_AIR',
  'MAINTENANCE', 'INSPECTION', 'INTERMODAL_HANDOVER',
])

export const operationStatusEnum = operationsSchema.enum('operation_status', [
  'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DELAYED', 'ON_HOLD',
])

export const operationPriorityEnum = operationsSchema.enum('operation_priority', [
  'LOW', 'NORMAL', 'HIGH', 'CRITICAL',
])

export const dependencyTypeEnum = operationsSchema.enum('dependency_type', [
  'FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH', 'START_TO_FINISH',
])

export const interventionTypeEnum = operationsSchema.enum('intervention_type', [
  'RESCHEDULE', 'REALLOCATE', 'CANCEL', 'REPRIORITIZE', 'EMERGENCY_STOP',
])

export const interventionStatusEnum = operationsSchema.enum('intervention_status', [
  'PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'AUTO_APPROVED', 'CANCELLED',
])

// ─────────────────────────────────────────
// Tables
// ─────────────────────────────────────────

export const operations = operationsSchema.table('operations', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  type: operationTypeEnum('type').notNull(),
  status: operationStatusEnum('status').notNull().default('SCHEDULED'),
  priority: operationPriorityEnum('priority').notNull().default('NORMAL'),
  referenceId: text('reference_id'),
  referenceType: text('reference_type'),
  isCrossEntity: boolean('is_cross_entity').notNull().default(false),
  relatedEntityIds: text('related_entity_ids').array(),
  scheduledStart: timestamp('scheduled_start', { withTimezone: true }),
  scheduledEnd: timestamp('scheduled_end', { withTimezone: true }),
  actualStart: timestamp('actual_start', { withTimezone: true }),
  actualEnd: timestamp('actual_end', { withTimezone: true }),
  delayMinutes: integer('delay_minutes').notNull().default(0),
  cancelledBy: text('cancelled_by'),
  cancellationReason: text('cancellation_reason'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('operations_org_id_idx').on(t.orgId),
  index('operations_org_status_idx').on(t.orgId, t.status),
  index('operations_org_type_idx').on(t.orgId, t.type),
  index('operations_org_scheduled_idx').on(t.orgId, t.scheduledStart),
  index('operations_reference_idx').on(t.orgId, t.referenceType, t.referenceId),
])

export const operationDependencies = operationsSchema.table('operation_dependencies', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  operationId: text('operation_id').notNull(),
  dependsOnId: text('depends_on_id').notNull(),
  dependsOnOrgId: text('depends_on_org_id').notNull(),
  dependencyType: dependencyTypeEnum('dependency_type').notNull().default('FINISH_TO_START'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('op_deps_operation_idx').on(t.orgId, t.operationId),
  index('op_deps_depends_on_idx').on(t.dependsOnOrgId, t.dependsOnId),
  uniqueIndex('op_deps_unique_idx').on(t.operationId, t.dependsOnId),
])

export const operationResources = operationsSchema.table('operation_resources', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  operationId: text('operation_id').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id').notNull(),
  quantity: integer('quantity').notNull().default(1),
  status: text('status').notNull().default('ALLOCATED'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('op_resources_operation_idx').on(t.orgId, t.operationId),
  index('op_resources_resource_idx').on(t.resourceType, t.resourceId),
])

export const operationEvents = operationsSchema.table('operation_events', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  operationId: text('operation_id').notNull(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  actorId: text('actor_id'),
  actorType: text('actor_type').notNull().default('USER'),
}, (t) => [
  index('op_events_operation_idx').on(t.orgId, t.operationId),
  index('op_events_occurred_idx').on(t.orgId, t.occurredAt),
])

export const interventionRequests = operationsSchema.table('intervention_requests', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  targetOrgId: text('target_org_id').notNull(),
  operationId: text('operation_id').notNull(),
  interventionType: interventionTypeEnum('intervention_type').notNull(),
  reason: text('reason').notNull(),
  proposedChanges: jsonb('proposed_changes').notNull(),
  status: interventionStatusEnum('status').notNull().default('PENDING'),
  requestedBy: text('requested_by').notNull(),
  respondedBy: text('responded_by'),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
  slaDeadline: timestamp('sla_deadline', { withTimezone: true }).notNull(),
  escalatedTo: text('escalated_to'),
  escalatedAt: timestamp('escalated_at', { withTimezone: true }),
  executedAt: timestamp('executed_at', { withTimezone: true }),
  executionNotes: text('execution_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('interventions_org_idx').on(t.orgId),
  index('interventions_target_org_idx').on(t.targetOrgId),
  index('interventions_operation_idx').on(t.operationId),
  index('interventions_status_idx').on(t.status),
  index('interventions_sla_idx').on(t.slaDeadline),
  index('interventions_pending_sla_idx').on(t.status, t.slaDeadline),
])
