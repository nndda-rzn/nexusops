import { pgSchema, text, timestamp, date, boolean, integer, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { ulid } from 'ulid'

// ─────────────────────────────────────────
// Schema
// ─────────────────────────────────────────
export const workforceSchema = pgSchema('workforce')

// ─────────────────────────────────────────
// Enums
// ─────────────────────────────────────────
export const employeeTypeEnum = workforceSchema.enum('employee_type', [
  'PERMANENT', 'CONTRACT', 'OUTSOURCE',
])

export const employeeStatusEnum = workforceSchema.enum('employee_status', [
  'ACTIVE', 'INACTIVE', 'SUSPENDED', 'RESIGNED',
])

export const shiftTypeEnum = workforceSchema.enum('shift_type', [
  'DAY', 'EVENING', 'NIGHT', 'ROTATING',
])

export const shiftScheduleStatusEnum = workforceSchema.enum('shift_schedule_status', [
  'SCHEDULED', 'CONFIRMED', 'ATTENDED', 'ABSENT', 'LEAVE',
])

export const crewTypeEnum = workforceSchema.enum('crew_type', [
  'CRANE', 'STEVEDORE', 'GATE', 'YARD', 'WAREHOUSE', 'RAIL', 'ROAD',
])

export const crewStatusEnum = workforceSchema.enum('crew_status', [
  'AVAILABLE', 'ON_DUTY', 'OFF_DUTY',
])

export const qualificationLevelEnum = workforceSchema.enum('qualification_level', [
  'BASIC', 'INTERMEDIATE', 'ADVANCED', 'EXPERT',
])

export const certificationStatusEnum = workforceSchema.enum('certification_status', [
  'VALID', 'EXPIRED', 'SUSPENDED',
])

export const assignmentTypeEnum = workforceSchema.enum('assignment_type', [
  'OPERATION', 'CRANE', 'GATE', 'SHIFT', 'TRIP', 'TRAIN', 'FLIGHT',
])

export const assignmentStatusEnum = workforceSchema.enum('assignment_status', [
  'PLANNED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED',
])

export const availabilityTypeEnum = workforceSchema.enum('availability_type', [
  'AVAILABLE', 'LEAVE', 'SICK', 'OFF', 'TRAINING',
])

// ─────────────────────────────────────────
// Tables
// ─────────────────────────────────────────

// Employees
export const employees = workforceSchema.table('employees', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  userId: text('user_id'),              // FK to identity.users — nullable
  employeeNumber: text('employee_number').notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  department: text('department'),
  position: text('position'),
  type: employeeTypeEnum('type').notNull(),
  joinDate: date('join_date').notNull(),
  status: employeeStatusEnum('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('employees_org_id_idx').on(t.orgId),
  index('employees_org_status_idx').on(t.orgId, t.status),
  uniqueIndex('employees_org_number_unique').on(t.orgId, t.employeeNumber),
])

// Shifts
export const shifts = workforceSchema.table('shifts', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  name: text('name').notNull(),
  startTime: text('start_time').notNull(),   // HH:mm format
  endTime: text('end_time').notNull(),
  durationHours: integer('duration_hours').notNull(),
  breakDurationMinutes: integer('break_duration_minutes').notNull().default(0),
  shiftType: shiftTypeEnum('shift_type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('shifts_org_idx').on(t.orgId),
])

// Shift Schedules (roster)
export const shiftSchedules = workforceSchema.table('shift_schedules', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  employeeId: text('employee_id').notNull().references(() => employees.id),
  shiftId: text('shift_id').notNull().references(() => shifts.id),
  date: date('date').notNull(),
  status: shiftScheduleStatusEnum('status').notNull().default('SCHEDULED'),
  actualStart: timestamp('actual_start', { withTimezone: true }),
  actualEnd: timestamp('actual_end', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('shift_schedules_org_idx').on(t.orgId),
  index('shift_schedules_employee_idx').on(t.orgId, t.employeeId),
  index('shift_schedules_date_idx').on(t.orgId, t.date),
])

// Crews
export const crews = workforceSchema.table('crews', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  name: text('name').notNull(),
  crewType: crewTypeEnum('crew_type').notNull(),
  leaderId: text('leader_id').references(() => employees.id),
  shiftId: text('shift_id').references(() => shifts.id),
  status: crewStatusEnum('status').notNull().default('AVAILABLE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('crews_org_idx').on(t.orgId),
  index('crews_org_status_idx').on(t.orgId, t.status),
])

// Crew Members
export const crewMembers = workforceSchema.table('crew_members', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  crewId: text('crew_id').notNull().references(() => crews.id),
  employeeId: text('employee_id').notNull().references(() => employees.id),
  role: text('role').notNull(),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('crew_members_crew_idx').on(t.crewId),
  index('crew_members_employee_idx').on(t.employeeId),
])

// Qualifications
export const qualifications = workforceSchema.table('qualifications', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  employeeId: text('employee_id').notNull().references(() => employees.id),
  qualificationType: text('qualification_type').notNull(),
  level: qualificationLevelEnum('level').notNull(),
  acquiredAt: date('acquired_at').notNull(),
  validUntil: date('valid_until'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('qualifications_org_idx').on(t.orgId),
  index('qualifications_employee_idx').on(t.employeeId),
])

// Certifications
export const certifications = workforceSchema.table('certifications', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  employeeId: text('employee_id').notNull().references(() => employees.id),
  certificationName: text('certification_name').notNull(),
  issuingBody: text('issuing_body').notNull(),
  certificateNumber: text('certificate_number').notNull(),
  issuedAt: date('issued_at').notNull(),
  expiresAt: date('expires_at'),
  status: certificationStatusEnum('status').notNull().default('VALID'),
  documentId: text('document_id'),     // FK to storage.files
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('certifications_org_idx').on(t.orgId),
  index('certifications_employee_idx').on(t.employeeId),
  index('certifications_status_idx').on(t.orgId, t.status),
])

// Assignments
export const assignments = workforceSchema.table('assignments', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  employeeId: text('employee_id').references(() => employees.id),
  crewId: text('crew_id').references(() => crews.id),
  assignmentType: assignmentTypeEnum('assignment_type').notNull(),
  referenceId: text('reference_id').notNull(),
  referenceType: text('reference_type').notNull(),
  role: text('role'),
  scheduledStart: timestamp('scheduled_start', { withTimezone: true }).notNull(),
  scheduledEnd: timestamp('scheduled_end', { withTimezone: true }).notNull(),
  actualStart: timestamp('actual_start', { withTimezone: true }),
  actualEnd: timestamp('actual_end', { withTimezone: true }),
  status: assignmentStatusEnum('status').notNull().default('PLANNED'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('assignments_org_idx').on(t.orgId),
  index('assignments_employee_idx').on(t.orgId, t.employeeId),
  index('assignments_reference_idx').on(t.referenceId, t.referenceType),
  index('assignments_status_idx').on(t.orgId, t.status),
])

// Availability
export const availability = workforceSchema.table('availability', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  employeeId: text('employee_id').notNull().references(() => employees.id),
  date: date('date').notNull(),
  availabilityType: availabilityTypeEnum('availability_type').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('availability_org_idx').on(t.orgId),
  index('availability_employee_date_idx').on(t.employeeId, t.date),
])
