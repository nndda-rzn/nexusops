import { assignments } from '@/shared/database/schema/workforce'
import { eq, and } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { AssignmentNotFoundError } from '@/modules/workforce/domain/errors/workforce.errors'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export interface CreateAssignmentCommand {
  orgId: string
  employeeId?: string | undefined
  crewId?: string | undefined
  assignmentType: 'OPERATION' | 'CRANE' | 'GATE' | 'SHIFT' | 'TRIP' | 'TRAIN' | 'FLIGHT'
  referenceId: string
  referenceType: string
  role?: string | undefined
  scheduledStart: Date
  scheduledEnd: Date
}

export async function createAssignmentCommand(
  cmd: CreateAssignmentCommand,
  db: DbContext
): Promise<{ id: string }> {
  const id = generateId()
  const now = new Date()

  await db.insert(assignments).values({
    id, orgId: cmd.orgId,
    employeeId: cmd.employeeId, crewId: cmd.crewId,
    assignmentType: cmd.assignmentType,
    referenceId: cmd.referenceId, referenceType: cmd.referenceType,
    role: cmd.role,
    scheduledStart: cmd.scheduledStart, scheduledEnd: cmd.scheduledEnd,
    status: 'PLANNED',
    createdAt: now, updatedAt: now,
  })

  await eventBus.emit('workforce.assigned', {
    type: 'workforce.assigned',
    assignmentId: id, orgId: cmd.orgId,
    employeeId: cmd.employeeId, crewId: cmd.crewId,
    assignmentType: cmd.assignmentType,
    referenceId: cmd.referenceId, referenceType: cmd.referenceType,
    occurredAt: now,
  })

  return { id }
}

export async function completeAssignmentCommand(
  cmd: { assignmentId: string; orgId: string },
  db: DbContext
): Promise<void> {
  const [existing] = await db.select({ id: assignments.id })
    .from(assignments)
    .where(and(eq(assignments.id, cmd.assignmentId), eq(assignments.orgId, cmd.orgId)))
    .limit(1)

  if (!existing) throw new AssignmentNotFoundError(cmd.assignmentId)

  const now = new Date()
  await db.update(assignments)
    .set({ status: 'COMPLETED', actualEnd: now, updatedAt: now })
    .where(and(eq(assignments.id, cmd.assignmentId), eq(assignments.orgId, cmd.orgId)))

  await eventBus.emit('workforce.assignment_completed', {
    type: 'workforce.assignment_completed',
    assignmentId: cmd.assignmentId, orgId: cmd.orgId,
    occurredAt: now,
  })
}
