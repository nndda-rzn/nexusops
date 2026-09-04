import { pgSchema, text, timestamp, numeric, integer, boolean, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { ulid } from 'ulid'

export const aviationSchema = pgSchema('aviation')

// ─── Enums ───
export const aircraftStatusEnum = aviationSchema.enum('aircraft_status', [
  'ACTIVE', 'MAINTENANCE', 'AOG', 'RETIRED',
])
export const flightStatusEnum = aviationSchema.enum('flight_status', [
  'SCHEDULED', 'SLOT_CONFIRMED', 'CARGO_ACCEPTANCE', 'MANIFEST_CLOSED',
  'LOAD_PLANNED', 'LOADING', 'READY_FOR_DEPARTURE', 'DEPARTED',
  'ARRIVED', 'OFFLOADING', 'COMPLETED', 'DELAYED', 'DIVERTED', 'CANCELLED', 'AOG',
])
export const slotTypeEnum = aviationSchema.enum('slot_type', ['DEPARTURE', 'ARRIVAL'])
export const slotStatusEnum = aviationSchema.enum('slot_status', ['REQUESTED', 'CONFIRMED', 'USED', 'CANCELLED'])
export const awbStatusEnum = aviationSchema.enum('awb_status', ['DRAFT', 'ISSUED', 'IN_TRANSIT', 'DELIVERED', 'VOID'])
export const manifestStatusEnum = aviationSchema.enum('manifest_status', ['OPEN', 'CLOSED', 'SUBMITTED_CUSTOMS', 'CLEARED'])
export const loadPlanStatusEnum = aviationSchema.enum('load_plan_status', ['DRAFT', 'APPROVED', 'EXECUTED'])
export const handlingTypeEnum = aviationSchema.enum('handling_type', ['INBOUND', 'OUTBOUND', 'TRANSIT'])
export const handlingStatusEnum = aviationSchema.enum('handling_status', ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED'])
export const crewRoleEnum = aviationSchema.enum('crew_role', ['CAPTAIN', 'FIRST_OFFICER', 'LOADMASTER'])
export const crewAssignmentStatusEnum = aviationSchema.enum('crew_assignment_status', ['ASSIGNED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'])

// ─── Tables ───

// Aircraft
export const aircraft = aviationSchema.table('aircraft', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  registrationNumber: text('registration_number').notNull(),
  aircraftType: text('aircraft_type').notNull(),
  maxPayloadKg: numeric('max_payload_kg'),
  maxVolumeM3: numeric('max_volume_m3'),
  cargoCompartments: jsonb('cargo_compartments'),
  operatorOrgId: text('operator_org_id'),
  status: aircraftStatusEnum('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('aircraft_org_idx').on(t.orgId),
  index('aircraft_status_idx').on(t.orgId, t.status),
  uniqueIndex('aircraft_org_reg_unique').on(t.orgId, t.registrationNumber),
])

// Flights
export const flights = aviationSchema.table('flights', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  flightNumber: text('flight_number').notNull(),
  aircraftId: text('aircraft_id').notNull().references(() => aircraft.id),
  originAirportId: text('origin_airport_id'),     // FK to shared_master.airports
  destinationAirportId: text('destination_airport_id'),
  scheduledDeparture: timestamp('scheduled_departure', { withTimezone: true }).notNull(),
  scheduledArrival: timestamp('scheduled_arrival', { withTimezone: true }).notNull(),
  actualDeparture: timestamp('actual_departure', { withTimezone: true }),
  actualArrival: timestamp('actual_arrival', { withTimezone: true }),
  status: flightStatusEnum('status').notNull().default('SCHEDULED'),
  slotId: text('slot_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('flights_org_idx').on(t.orgId),
  index('flights_status_idx').on(t.orgId, t.status),
  index('flights_departure_idx').on(t.orgId, t.scheduledDeparture),
  uniqueIndex('flights_org_number_unique').on(t.orgId, t.flightNumber),
])

// Airport Slots
export const airportSlots = aviationSchema.table('airport_slots', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  airportId: text('airport_id').notNull(),         // FK to shared_master.airports
  flightId: text('flight_id').references(() => flights.id),
  slotType: slotTypeEnum('slot_type').notNull(),
  scheduledTime: timestamp('scheduled_time', { withTimezone: true }).notNull(),
  status: slotStatusEnum('status').notNull().default('REQUESTED'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('airport_slots_org_idx').on(t.orgId),
  index('airport_slots_flight_idx').on(t.flightId),
])

// Airway Bills (AWB)
export const airwayBills = aviationSchema.table('airway_bills', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  awbNumber: text('awb_number').notNull(),
  flightId: text('flight_id').references(() => flights.id),
  shipperId: text('shipper_id'),
  consigneeId: text('consignee_id'),
  originAirportId: text('origin_airport_id'),
  destinationAirportId: text('destination_airport_id'),
  commodityTypeId: text('commodity_type_id'),
  pieces: integer('pieces').notNull().default(0),
  grossWeightKg: numeric('gross_weight_kg').notNull(),
  chargeableWeightKg: numeric('chargeable_weight_kg'),
  volumeM3: numeric('volume_m3'),
  isDangerousGoods: boolean('is_dangerous_goods').notNull().default(false),
  dgClass: text('dg_class'),
  status: awbStatusEnum('status').notNull().default('DRAFT'),
  documentId: text('document_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('airway_bills_org_idx').on(t.orgId),
  index('airway_bills_flight_idx').on(t.flightId),
  uniqueIndex('airway_bills_org_number_unique').on(t.orgId, t.awbNumber),
])

// Cargo Manifests
export const cargoManifests = aviationSchema.table('cargo_manifests', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  flightId: text('flight_id').notNull().references(() => flights.id),
  manifestNumber: text('manifest_number').notNull(),
  totalPieces: integer('total_pieces').notNull().default(0),
  totalWeightKg: numeric('total_weight_kg').notNull().default('0'),
  totalVolumeM3: numeric('total_volume_m3'),
  status: manifestStatusEnum('status').notNull().default('OPEN'),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  documentId: text('document_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('cargo_manifests_org_idx').on(t.orgId),
  uniqueIndex('cargo_manifests_flight_unique').on(t.flightId),
])

// Manifest Items
export const manifestItems = aviationSchema.table('manifest_items', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  manifestId: text('manifest_id').notNull().references(() => cargoManifests.id),
  awbId: text('awb_id').notNull().references(() => airwayBills.id),
  pieces: integer('pieces').notNull(),
  weightKg: numeric('weight_kg').notNull(),
  positionCode: text('position_code'),
}, (t) => [
  index('manifest_items_manifest_idx').on(t.manifestId),
])

// Load Plans
export const loadPlans = aviationSchema.table('load_plans', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  flightId: text('flight_id').notNull().references(() => flights.id),
  aircraftId: text('aircraft_id').notNull().references(() => aircraft.id),
  totalPayloadKg: numeric('total_payload_kg'),
  cgPosition: numeric('cg_position'),
  status: loadPlanStatusEnum('status').notNull().default('DRAFT'),
  approvedBy: text('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('load_plans_org_idx').on(t.orgId),
  index('load_plans_flight_idx').on(t.flightId),
])

// Load Plan Items
export const loadPlanItems = aviationSchema.table('load_plan_items', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  loadPlanId: text('load_plan_id').notNull().references(() => loadPlans.id),
  awbId: text('awb_id').notNull().references(() => airwayBills.id),
  compartment: text('compartment').notNull(),       // FORWARD | AFT | BULK
  position: text('position'),
  weightKg: numeric('weight_kg').notNull(),
  uldNumber: text('uld_number'),
}, (t) => [
  index('load_plan_items_plan_idx').on(t.loadPlanId),
])

// Ground Handlings
export const groundHandlings = aviationSchema.table('ground_handlings', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  flightId: text('flight_id').notNull().references(() => flights.id),
  airportId: text('airport_id').notNull(),
  handlingType: handlingTypeEnum('handling_type').notNull(),
  handlerOrgId: text('handler_org_id'),
  scheduledStart: timestamp('scheduled_start', { withTimezone: true }),
  scheduledEnd: timestamp('scheduled_end', { withTimezone: true }),
  actualStart: timestamp('actual_start', { withTimezone: true }),
  actualEnd: timestamp('actual_end', { withTimezone: true }),
  status: handlingStatusEnum('status').notNull().default('SCHEDULED'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('ground_handlings_org_idx').on(t.orgId),
  index('ground_handlings_flight_idx').on(t.flightId),
])

// Crew Assignments
export const aviationCrewAssignments = aviationSchema.table('crew_assignments', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  flightId: text('flight_id').notNull().references(() => flights.id),
  employeeId: text('employee_id'),    // FK to workforce.employees (resolved Phase 3 FK migration)
  role: crewRoleEnum('role').notNull(),
  status: crewAssignmentStatusEnum('status').notNull().default('ASSIGNED'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('aviation_crew_assignments_org_idx').on(t.orgId),
  index('aviation_crew_assignments_flight_idx').on(t.flightId),
])
