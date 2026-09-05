import { pgSchema, text, timestamp, integer, jsonb, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { ulid } from 'ulid'

export const planningSchema = pgSchema('planning')

// ─── Enums ───
export const optimizationJobTypeEnum = planningSchema.enum('optimization_job_type', [
  'YARD_OPTIMIZATION',
  'BERTH_SCHEDULING',
  'CRANE_SCHEDULING',
  'WORKFORCE_SCHEDULING',
  'ROUTE_OPTIMIZATION',
  'TRAIN_SCHEDULING',
  'NETWORK_ANALYSIS',
  'CRITICAL_PATH',
  'DELAY_PROPAGATION',
])
export const optimizationJobStatusEnum = planningSchema.enum('optimization_job_status', [
  'PENDING', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'RETRYING', 'DEAD', 'CANCELLED',
])
export const planTypeEnum = planningSchema.enum('plan_type', [
  'BERTH', 'CRANE', 'YARD', 'WORKFORCE', 'ROUTE', 'TRAIN', 'NETWORK',
])
export const planStatusEnum = planningSchema.enum('plan_status', [
  'DRAFT', 'ACTIVE', 'SUPERSEDED', 'ARCHIVED',
])
export const scheduleStatusEnum = planningSchema.enum('schedule_status', [
  'PLANNED', 'CONFIRMED', 'IN_USE', 'RELEASED',
])
export const scenarioStatusEnum = planningSchema.enum('scenario_status', [
  'CANDIDATE', 'SELECTED', 'REJECTED',
])
export const constraintTypeEnum = planningSchema.enum('constraint_type', [
  'HARD', 'SOFT',
])

// ─── Tables ───

export const optimizationJobs = planningSchema.table('optimization_jobs', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  jobType: optimizationJobTypeEnum('job_type').notNull(),
  status: optimizationJobStatusEnum('status').notNull().default('PENDING'),
  input: jsonb('input').notNull(),
  result: jsonb('result'),
  error: text('error'),
  retryCount: integer('retry_count').notNull().default(0),
  maxRetries: integer('max_retries').notNull().default(3),
  nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
  workerId: text('worker_id'),
  claimedAt: timestamp('claimed_at', { withTimezone: true }),
  heartbeatAt: timestamp('heartbeat_at', { withTimezone: true }),
  idempotencyKey: text('idempotency_key'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  queuedAt: timestamp('queued_at', { withTimezone: true }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  failedAt: timestamp('failed_at', { withTimezone: true }),
}, (t) => [
  index('optimization_jobs_org_idx').on(t.orgId),
  index('optimization_jobs_status_idx').on(t.orgId, t.status),
  index('optimization_jobs_type_idx').on(t.orgId, t.jobType),
  index('optimization_jobs_created_idx').on(t.orgId, t.createdAt),
  uniqueIndex('optimization_jobs_idempotency_unique').on(t.orgId, t.idempotencyKey),
])

export const optimizationJobEvents = planningSchema.table('optimization_job_events', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  jobId: text('job_id').notNull().references(() => optimizationJobs.id),
  fromStatus: optimizationJobStatusEnum('from_status'),
  toStatus: optimizationJobStatusEnum('to_status').notNull(),
  message: text('message'),
  payload: jsonb('payload'),
  actorId: text('actor_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('optimization_job_events_job_idx').on(t.orgId, t.jobId),
  index('optimization_job_events_created_idx').on(t.orgId, t.createdAt),
])

// ─────────────────────────────────────────
// Plans — a selected, approved optimization result that can be activated.
// ─────────────────────────────────────────

export const plans = planningSchema.table('plans', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  name: text('name').notNull(),
  planType: planTypeEnum('plan_type').notNull(),
  status: planStatusEnum('status').notNull().default('DRAFT'),
  validFrom: timestamp('valid_from', { withTimezone: true }),
  validUntil: timestamp('valid_until', { withTimezone: true }),
  optimizationJobId: text('optimization_job_id').references(() => optimizationJobs.id),
  scenarioId: text('scenario_id'),
  createdBy: text('created_by').notNull(),
  approvedBy: text('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  activatedAt: timestamp('activated_at', { withTimezone: true }),
  supersededBy: text('superseded_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('plans_org_idx').on(t.orgId),
  index('plans_org_status_idx').on(t.orgId, t.status),
  index('plans_org_type_idx').on(t.orgId, t.planType),
])

// ─────────────────────────────────────────
// Schedules — resource/time entries belonging to a plan.
// ─────────────────────────────────────────

export const schedules = planningSchema.table('schedules', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  planId: text('plan_id').notNull().references(() => plans.id),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id').notNull(),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  operationId: text('operation_id'),
  status: scheduleStatusEnum('status').notNull().default('PLANNED'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('schedules_org_idx').on(t.orgId),
  index('schedules_plan_idx').on(t.planId),
  index('schedules_resource_idx').on(t.resourceType, t.resourceId),
])

// ─────────────────────────────────────────
// Scenarios — candidate optimization results for comparison before selection.
// ─────────────────────────────────────────

export const scenarios = planningSchema.table('scenarios', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  planType: planTypeEnum('plan_type').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  optimizationJobId: text('optimization_job_id').references(() => optimizationJobs.id),
  metrics: jsonb('metrics'),
  status: scenarioStatusEnum('status').notNull().default('CANDIDATE'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('scenarios_org_idx').on(t.orgId),
  index('scenarios_org_type_idx').on(t.orgId, t.planType),
  index('scenarios_job_idx').on(t.optimizationJobId),
])

// ─────────────────────────────────────────
// Constraints — limits that an optimization must respect.
// ─────────────────────────────────────────

export const constraints = planningSchema.table('constraints', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  planType: planTypeEnum('plan_type').notNull(),
  constraintType: text('constraint_type').notNull(),
  description: text('description'),
  value: jsonb('value'),
  isHard: boolean('is_hard').notNull().default(true),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('constraints_org_idx').on(t.orgId),
  index('constraints_org_type_idx').on(t.orgId, t.planType),
])