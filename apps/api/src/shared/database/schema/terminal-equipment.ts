import {
  pgSchema, text, timestamp, integer, index,
} from 'drizzle-orm/pg-core'
import { ulid } from 'ulid'

export const terminalEquipmentSchema = pgSchema('terminal')

// D-03 FIX: use terminalEquipmentSchema.enum() not pgEnum() (public schema)
export const equipmentAssignmentStatusEnum = terminalEquipmentSchema.enum('equipment_assignment_status', [
  'PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED',
])

export const equipmentAssignments = terminalEquipmentSchema.table('equipment_assignments', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  craneId: text('crane_id').notNull(),
  berthId: text('berth_id').notNull(),
  portCallId: text('port_call_id').notNull(),
  plannedStart: timestamp('planned_start', { withTimezone: true }).notNull(),
  plannedEnd: timestamp('planned_end', { withTimezone: true }).notNull(),
  actualStart: timestamp('actual_start', { withTimezone: true }),
  actualEnd: timestamp('actual_end', { withTimezone: true }),
  assignedMoves: integer('assigned_moves').notNull().default(0),
  completedMoves: integer('completed_moves').notNull().default(0),
  status: equipmentAssignmentStatusEnum('status').notNull().default('PLANNED'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('equip_assignments_org_idx').on(t.orgId),
  index('equip_assignments_crane_idx').on(t.orgId, t.craneId),
  index('equip_assignments_berth_idx').on(t.orgId, t.berthId),
  index('equip_assignments_status_idx').on(t.orgId, t.status),
])
