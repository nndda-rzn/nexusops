import {
  pgSchema, text, timestamp, numeric, pgEnum, index, uniqueIndex,
} from 'drizzle-orm/pg-core'
import { ulid } from 'ulid'

export const shipmentsSchema = pgSchema('shipments')

// ─────────────────────────────────────────
// Enums
// ─────────────────────────────────────────
export const shipmentTypeEnum = pgEnum('shipment_type', ['GROUP', 'ENTITY'])

export const shipmentStatusEnum = pgEnum('shipment_status', [
  'DRAFT', 'BOOKED', 'IN_TRANSIT', 'AT_TERMINAL',
  'CUSTOMS_CLEARANCE', 'DELIVERED', 'COMPLETED',
  'ON_HOLD', 'DELAYED', 'DAMAGED', 'LOST', 'CANCELLED',
])

export const legModeEnum = pgEnum('leg_mode', ['SEA', 'RAIL', 'ROAD', 'AIR'])

export const legStatusEnum = pgEnum('leg_status', [
  'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DELAYED',
])

export const exceptionStatusEnum = pgEnum('exception_status', ['OPEN', 'RESOLVED'])

// ─────────────────────────────────────────
// Tables
// ─────────────────────────────────────────

export const shipments = shipmentsSchema.table('shipments', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  shipmentType: shipmentTypeEnum('shipment_type').notNull().default('ENTITY'),
  referenceNumber: text('reference_number').notNull(),
  status: shipmentStatusEnum('status').notNull().default('DRAFT'),
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  cargoType: text('cargo_type'),
  totalWeight: numeric('total_weight'),
  totalVolume: numeric('total_volume'),
  customerId: text('customer_id'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('shipments_org_id_idx').on(t.orgId),
  index('shipments_org_status_idx').on(t.orgId, t.status),
  index('shipments_customer_idx').on(t.orgId, t.customerId),
  uniqueIndex('shipments_org_ref_unique').on(t.orgId, t.referenceNumber),
])

export const shipmentLegs = shipmentsSchema.table('shipment_legs', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),               // owner entity for this leg
  shipmentId: text('shipment_id').notNull(),
  sequenceNumber: text('sequence_number').notNull(),
  mode: legModeEnum('mode').notNull(),
  carrierOrgId: text('carrier_org_id'),           // entitas yang operasikan
  ownerOrgId: text('owner_org_id').notNull(),     // entitas yang bertanggung jawab
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  scheduledDeparture: timestamp('scheduled_departure', { withTimezone: true }),
  scheduledArrival: timestamp('scheduled_arrival', { withTimezone: true }),
  actualDeparture: timestamp('actual_departure', { withTimezone: true }),
  actualArrival: timestamp('actual_arrival', { withTimezone: true }),
  delayMinutes: text('delay_minutes').notNull().default('0'),
  status: legStatusEnum('status').notNull().default('PLANNED'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('legs_shipment_idx').on(t.orgId, t.shipmentId),
  index('legs_status_idx').on(t.orgId, t.status),
])

export const shipmentMilestones = shipmentsSchema.table('milestones', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  shipmentId: text('shipment_id').notNull(),
  legId: text('leg_id'),
  milestoneType: text('milestone_type').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  location: text('location'),
  recordedBy: text('recorded_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('milestones_shipment_idx').on(t.orgId, t.shipmentId),
])

export const shipmentExceptions = shipmentsSchema.table('exceptions', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  shipmentId: text('shipment_id').notNull(),
  legId: text('leg_id'),
  exceptionType: text('exception_type').notNull(),
  description: text('description').notNull(),
  status: exceptionStatusEnum('status').notNull().default('OPEN'),
  raisedBy: text('raised_by').notNull(),
  raisedAt: timestamp('raised_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolvedBy: text('resolved_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('exceptions_shipment_idx').on(t.orgId, t.shipmentId),
  index('exceptions_status_idx').on(t.orgId, t.status),
])

export const shipmentManifests = shipmentsSchema.table('manifests', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  shipmentId: text('shipment_id').notNull(),
  documentType: text('document_type').notNull(), // MANIFEST | BOL | PACKING_LIST | DELIVERY_ORDER
  fileId: text('file_id').notNull(),
  issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
  issuedBy: text('issued_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('manifests_shipment_idx').on(t.orgId, t.shipmentId),
])
