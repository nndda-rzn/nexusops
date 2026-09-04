import { pgSchema, text, timestamp, numeric, integer, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { ulid } from 'ulid'

// ─────────────────────────────────────────
// Schema
// ─────────────────────────────────────────
export const railSchema = pgSchema('rail')

// ─────────────────────────────────────────
// Enums
// ─────────────────────────────────────────
export const trainStatusEnum = railSchema.enum('train_status', [
  'SCHEDULED', 'TRAINSET_ASSIGNED', 'CREW_ASSIGNED', 'LOADING',
  'READY_TO_DEPART', 'EN_ROUTE', 'ARRIVED', 'UNLOADING',
  'COMPLETED', 'DELAYED', 'CANCELLED',
])

export const trainsetStatusEnum = railSchema.enum('trainset_status', [
  'AVAILABLE', 'IN_USE', 'MAINTENANCE',
])

export const crewRoleEnum = railSchema.enum('crew_role', [
  'DRIVER', 'ASSISTANT', 'CONDUCTOR',
])

export const trainFrequencyEnum = railSchema.enum('train_frequency', [
  'DAILY', 'WEEKLY', 'CUSTOM',
])

// ─────────────────────────────────────────
// Tables
// ─────────────────────────────────────────

// Train Services (rute reguler)
export const trainServices = railSchema.table('train_services', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  serviceCode: text('service_code').notNull(),
  originStationId: text('origin_station_id').notNull(),  // FK to shared_master.stations
  destinationStationId: text('destination_station_id').notNull(),
  frequency: trainFrequencyEnum('frequency').notNull(),
  commodityType: text('commodity_type'),
  operator: text('operator'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('train_services_org_idx').on(t.orgId),
  uniqueIndex('train_services_org_code_unique').on(t.orgId, t.serviceCode),
])

// Trainsets (komposisi fisik kereta)
export const trainsets = railSchema.table('trainsets', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  trainsetNumber: text('trainset_number').notNull(),
  locomotiveId: text('locomotive_id'),  // FK to assets (Phase 3) — nullable
  capacityTeu: integer('capacity_teu'),
  capacityWeight: numeric('capacity_weight'),
  status: trainsetStatusEnum('status').notNull().default('AVAILABLE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('trainsets_org_idx').on(t.orgId),
  index('trainsets_org_status_idx').on(t.orgId, t.status),
  uniqueIndex('trainsets_org_number_unique').on(t.orgId, t.trainsetNumber),
])

// Trains (instance perjalanan)
export const trains = railSchema.table('trains', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  serviceId: text('service_id').notNull().references(() => trainServices.id),
  trainNumber: text('train_number').notNull(),
  trainsetId: text('trainset_id').references(() => trainsets.id),
  scheduledDeparture: timestamp('scheduled_departure', { withTimezone: true }).notNull(),
  scheduledArrival: timestamp('scheduled_arrival', { withTimezone: true }).notNull(),
  actualDeparture: timestamp('actual_departure', { withTimezone: true }),
  actualArrival: timestamp('actual_arrival', { withTimezone: true }),
  status: trainStatusEnum('status').notNull().default('SCHEDULED'),
  delayMinutes: integer('delay_minutes').notNull().default(0),
  cancellationReason: text('cancellation_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('trains_org_idx').on(t.orgId),
  index('trains_org_status_idx').on(t.orgId, t.status),
  index('trains_service_idx').on(t.orgId, t.serviceId),
  uniqueIndex('trains_org_number_unique').on(t.orgId, t.trainNumber),
])

// Platform Assignments
export const platformAssignments = railSchema.table('platform_assignments', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  trainId: text('train_id').notNull().references(() => trains.id),
  stationId: text('station_id').notNull(),  // FK to shared_master.stations
  platformNumber: text('platform_number').notNull(),
  scheduledArrival: timestamp('scheduled_arrival', { withTimezone: true }),
  scheduledDeparture: timestamp('scheduled_departure', { withTimezone: true }),
  actualArrival: timestamp('actual_arrival', { withTimezone: true }),
  actualDeparture: timestamp('actual_departure', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('platform_assignments_org_idx').on(t.orgId),
  index('platform_assignments_train_idx').on(t.trainId),
])

// Crew Assignments
export const crewAssignments = railSchema.table('crew_assignments', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  trainId: text('train_id').notNull().references(() => trains.id),
  employeeId: text('employee_id'),  // FK to workforce.employees (Phase 3) — nullable
  role: crewRoleEnum('role').notNull(),
  fromStationId: text('from_station_id').notNull(),
  toStationId: text('to_station_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('crew_assignments_org_idx').on(t.orgId),
  index('crew_assignments_train_idx').on(t.trainId),
])
