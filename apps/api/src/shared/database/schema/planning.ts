import { pgSchema, text, timestamp, integer, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core'
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