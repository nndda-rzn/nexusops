import { berths, berthAssignments } from '@/shared/database/schema/terminal'
import { eq, and, or, lt, gt } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { eventBus } from '@/shared/events'
import {
  BerthNotFoundError,
  BerthNotAvailableError,
  BerthOverlapError,
} from '@/modules/terminal/domain/errors/berth.errors'
import type { DbContext } from '@/shared/database/client'

export interface AssignBerthCommand {
  orgId: string
  portCallId: string
  berthId: string
  plannedStart: Date
  plannedEnd: Date
  assignedBy: string
  notes?: string | undefined
}

export interface AssignBerthResult {
  assignmentId: string
  berthId: string
  portCallId: string
  plannedStart: Date
  plannedEnd: Date
}

export async function assignBerthCommand(
  cmd: AssignBerthCommand,
  db: DbContext
): Promise<AssignBerthResult> {
  // 1. Verify berth exists and is available
  const [berth] = await db
    .select()
    .from(berths)
    .where(and(eq(berths.id, cmd.berthId), eq(berths.orgId, cmd.orgId)))
    .limit(1)

  if (!berth) throw new BerthNotFoundError(cmd.berthId)
  if (berth.status !== 'AVAILABLE') throw new BerthNotAvailableError(cmd.berthId, berth.status)

  // 2. Check for time overlap with existing assignments
  const [overlap] = await db
    .select()
    .from(berthAssignments)
    .where(and(
      eq(berthAssignments.berthId, cmd.berthId),
      eq(berthAssignments.orgId, cmd.orgId),
      or(
        eq(berthAssignments.status, 'PLANNED'),
        eq(berthAssignments.status, 'ACTIVE'),
      ),
      // Overlap: existing.start < cmd.end AND existing.end > cmd.start
      lt(berthAssignments.plannedStart, cmd.plannedEnd),
      gt(berthAssignments.plannedEnd, cmd.plannedStart),
    ))
    .limit(1)

  if (overlap) throw new BerthOverlapError(cmd.berthId)

  // 3. Create assignment
  const id = generateId()
  await db.insert(berthAssignments).values({
    id,
    orgId: cmd.orgId,
    portCallId: cmd.portCallId,
    berthId: cmd.berthId,
    plannedStart: cmd.plannedStart,
    plannedEnd: cmd.plannedEnd,
    status: 'PLANNED',
    assignedBy: cmd.assignedBy,
    notes: cmd.notes,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  // 4. Update berth status
  await db.update(berths)
    .set({ status: 'RESERVED', updatedAt: new Date() })
    .where(eq(berths.id, cmd.berthId))

  await eventBus.emit('berth.assigned', {
    type: 'berth.assigned',
    assignmentId: id,
    orgId: cmd.orgId,
    portCallId: cmd.portCallId,
    berthId: cmd.berthId,
    plannedStart: cmd.plannedStart,
    occurredAt: new Date(),
    assignedBy: cmd.assignedBy,
  })

  return {
    assignmentId: id,
    berthId: cmd.berthId,
    portCallId: cmd.portCallId,
    plannedStart: cmd.plannedStart,
    plannedEnd: cmd.plannedEnd,
  }
}
