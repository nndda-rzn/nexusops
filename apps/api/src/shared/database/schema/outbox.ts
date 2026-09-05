import { pgSchema, text, timestamp, jsonb, integer, index } from 'drizzle-orm/pg-core'
import { ulid } from 'ulid'

export const sharedSchema = pgSchema('shared')

export const outboxEventStatusEnum = sharedSchema.enum('outbox_event_status', [
  'PENDING', 'PUBLISHED', 'FAILED',
])

// ─────────────────────────────────────────
// Transactional outbox — PostgreSQL is source of truth,
// Redis is only the delivery mechanism (data-consistency rule).
// Events are committed with their business data in ONE transaction,
// then a background publisher forwards them to Redis Streams.
// ─────────────────────────────────────────
export const outboxEvents = sharedSchema.table('outbox_events', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  eventType: text('event_type').notNull(),
  aggregateType: text('aggregate_type'),
  aggregateId: text('aggregate_id'),
  payload: jsonb('payload').notNull(),
  status: outboxEventStatusEnum('status').notNull().default('PENDING'),
  retryCount: integer('retry_count').notNull().default(0),
  lastError: text('last_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
}, (t) => [
  index('outbox_events_status_idx').on(t.status, t.createdAt),
  index('outbox_events_org_idx').on(t.orgId),
])