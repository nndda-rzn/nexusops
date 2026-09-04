import { pgSchema, text, timestamp, numeric, integer, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { ulid } from 'ulid'
import { geometryPoint, geometryLine } from '@/shared/database/types/geometry'

// ─────────────────────────────────────────
// Schema
// ─────────────────────────────────────────
export const roadSchema = pgSchema('road')

// ─────────────────────────────────────────
// Enums
// ─────────────────────────────────────────
export const vehicleTypeEnum = roadSchema.enum('vehicle_type', [
  'TRUCK', 'TRAILER', 'PICKUP', 'VAN',
])

export const vehicleStatusEnum = roadSchema.enum('vehicle_status', [
  'AVAILABLE', 'ON_TRIP', 'MAINTENANCE', 'OFFLINE',
])

export const driverStatusEnum = roadSchema.enum('driver_status', [
  'AVAILABLE', 'ON_DUTY', 'OFF_DUTY', 'LEAVE',
])

export const tripStatusEnum = roadSchema.enum('trip_status', [
  'PLANNED', 'ASSIGNED', 'DISPATCHED', 'EN_ROUTE',
  'AT_CHECKPOINT', 'ARRIVED_DESTINATION', 'DELIVERING',
  'COMPLETED', 'DELAYED', 'BREAKDOWN', 'CANCELLED',
])

export const checkpointTypeEnum = roadSchema.enum('checkpoint_type', [
  'GATE_OUT', 'WEIGH_BRIDGE', 'TOLL', 'DELIVERY_POINT',
])

export const routeTypeEnum = roadSchema.enum('route_type', [
  'HIGHWAY', 'PROVINCIAL', 'LOCAL', 'TOLL',
])

// ─────────────────────────────────────────
// Tables
// ─────────────────────────────────────────

// Vehicles
export const vehicles = roadSchema.table('vehicles', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  assetId: text('asset_id'),  // FK to assets (Phase 3) — nullable
  plateNumber: text('plate_number').notNull(),
  type: vehicleTypeEnum('type').notNull(),
  brand: text('brand'),
  model: text('model'),
  year: integer('year'),
  capacityWeight: numeric('capacity_weight'),
  capacityVolume: numeric('capacity_volume'),
  containerCapable: boolean('container_capable').notNull().default(false),
  containerSizes: text('container_sizes'),  // JSON array stored as text
  hasReefer: boolean('has_reefer').notNull().default(false),
  status: vehicleStatusEnum('status').notNull().default('AVAILABLE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('vehicles_org_id_idx').on(t.orgId),
  index('vehicles_org_status_idx').on(t.orgId, t.status),
  uniqueIndex('vehicles_org_plate_unique').on(t.orgId, t.plateNumber),
])

// Drivers
export const drivers = roadSchema.table('drivers', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  employeeId: text('employee_id'),  // FK to workforce.employees (Phase 3) — nullable
  licenseNumber: text('license_number').notNull(),
  licenseType: text('license_type').notNull(),
  licenseExpiry: timestamp('license_expiry', { withTimezone: true }).notNull(),
  status: driverStatusEnum('status').notNull().default('AVAILABLE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('drivers_org_id_idx').on(t.orgId),
  index('drivers_org_status_idx').on(t.orgId, t.status),
])

// Routes
export const routes = roadSchema.table('routes', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  origin: geometryPoint('origin'),
  destination: geometryPoint('destination'),
  geometry: geometryLine('geometry'),
  distanceKm: numeric('distance_km').notNull(),
  estimatedDurationMinutes: integer('estimated_duration_minutes').notNull(),
  tollCost: numeric('toll_cost'),
  routeType: routeTypeEnum('route_type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('routes_org_idx').on(t.orgId),
])

// Trips
export const trips = roadSchema.table('trips', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  referenceNumber: text('reference_number').notNull(),
  vehicleId: text('vehicle_id').references(() => vehicles.id),
  driverId: text('driver_id').references(() => drivers.id),
  shipmentId: text('shipment_id'),  // FK to shipments (nullable)
  containerId: text('container_id'),  // FK to containers (nullable)
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  routeId: text('route_id').references(() => routes.id),
  scheduledDeparture: timestamp('scheduled_departure', { withTimezone: true }),
  scheduledArrival: timestamp('scheduled_arrival', { withTimezone: true }),
  actualDeparture: timestamp('actual_departure', { withTimezone: true }),
  actualArrival: timestamp('actual_arrival', { withTimezone: true }),
  status: tripStatusEnum('status').notNull().default('PLANNED'),
  delayMinutes: integer('delay_minutes').notNull().default(0),
  dispatcherId: text('dispatcher_id'),
  notes: text('notes'),
  cancellationReason: text('cancellation_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('trips_org_status_idx').on(t.orgId, t.status),
  index('trips_vehicle_idx').on(t.vehicleId),
  index('trips_driver_idx').on(t.driverId),
  uniqueIndex('trips_org_ref_unique').on(t.orgId, t.referenceNumber),
])

// Checkpoints
export const checkpoints = roadSchema.table('checkpoints', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  tripId: text('trip_id').notNull().references(() => trips.id),
  location: geometryPoint('location'),
  checkpointType: checkpointTypeEnum('checkpoint_type').notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  actualAt: timestamp('actual_at', { withTimezone: true }),
  status: text('status').notNull().default('PENDING'),
  notes: text('notes'),
}, (t) => [
  index('checkpoints_org_idx').on(t.orgId),
  index('checkpoints_trip_idx').on(t.tripId),
])

// Vehicle Positions (GPS — high volume, no org_id — RLS via vehicles)
export const vehiclePositions = roadSchema.table('vehicle_positions', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  vehicleId: text('vehicle_id').notNull().references(() => vehicles.id),
  position: geometryPoint('position').notNull(),
  speed: numeric('speed'),
  heading: numeric('heading'),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
}, (t) => [
  index('vehicle_positions_vehicle_time_idx').on(t.vehicleId, t.recordedAt),
  // Q-13: GIST spatial index on position — defined in migration 0015, not supported by Drizzle natively
  // CREATE INDEX vehicle_positions_geom_idx ON road.vehicle_positions USING GIST (position);
])
