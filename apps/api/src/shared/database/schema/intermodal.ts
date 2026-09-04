import {
  pgSchema, text, timestamp, jsonb, pgEnum, index,
} from 'drizzle-orm/pg-core'
import { ulid } from 'ulid'

export const intermodalSchema = pgSchema('intermodal')

// ─────────────────────────────────────────
// Enums
// ─────────────────────────────────────────
export const handoverStatusEnum = pgEnum('handover_status', [
  'PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED',
])

export const coordinationTypeEnum = pgEnum('coordination_type', [
  'RESOURCE_REQUEST', 'SCHEDULE_SYNC', 'CAPACITY_CHECK', 'EMERGENCY',
])

export const coordinationStatusEnum = pgEnum('coordination_status', [
  'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED',
])

export const transferStatusEnum = pgEnum('transfer_status', [
  'PENDING', 'APPROVED', 'SETTLED', 'DISPUTED',
])

// ─────────────────────────────────────────
// Tables
// ─────────────────────────────────────────

export const handoverRequests = intermodalSchema.table('handover_requests', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  shipmentId: text('shipment_id').notNull(),
  legId: text('leg_id').notNull(),
  nextLegId: text('next_leg_id'),
  fromEntityId: text('from_entity_id').notNull(),
  toEntityId: text('to_entity_id').notNull(),
  cargoDetails: jsonb('cargo_details'),
  handoverLocation: text('handover_location'),
  handoverLocationType: text('handover_location_type'),
  status: handoverStatusEnum('status').notNull().default('PENDING'),
  requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  rejectedAt: timestamp('rejected_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('handovers_shipment_idx').on(t.shipmentId),
  index('handovers_from_entity_idx').on(t.fromEntityId),
  index('handovers_to_entity_idx').on(t.toEntityId),
  index('handovers_status_idx').on(t.status),
])

export const coordinations = intermodalSchema.table('coordinations', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  initiatorOrgId: text('initiator_org_id').notNull(),
  targetOrgId: text('target_org_id').notNull(),
  coordinationType: coordinationTypeEnum('coordination_type').notNull(),
  referenceType: text('reference_type'),
  referenceId: text('reference_id'),
  message: text('message').notNull(),
  status: coordinationStatusEnum('status').notNull().default('OPEN'),
  resolvedBy: text('resolved_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
}, (t) => [
  index('coordinations_initiator_idx').on(t.initiatorOrgId),
  index('coordinations_target_idx').on(t.targetOrgId),
  index('coordinations_status_idx').on(t.status),
])

export const internalTransfers = intermodalSchema.table('internal_transfers', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  holdingOrgId: text('holding_org_id').notNull(),
  fromEntityId: text('from_entity_id').notNull(),
  toEntityId: text('to_entity_id').notNull(),
  referenceType: text('reference_type').notNull(),
  referenceId: text('reference_id').notNull(),
  description: text('description'),
  amount: text('amount').notNull(),
  currency: text('currency').notNull().default('IDR'),
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  status: transferStatusEnum('status').notNull().default('PENDING'),
  approvedBy: text('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  settledAt: timestamp('settled_at', { withTimezone: true }),
  disputeReason: text('dispute_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('transfers_holding_idx').on(t.holdingOrgId),
  index('transfers_from_idx').on(t.fromEntityId),
  index('transfers_status_idx').on(t.status),
])
