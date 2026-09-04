import { cranes } from '@/shared/database/schema/terminal'
import { equipmentAssignments } from '@/shared/database/schema/terminal-equipment'
import { eq, and } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { eventBus } from '@/shared/events'
import {
  CraneNotFoundError,
  CraneNotAvailableError,
} from '@/modules/terminal/domain/errors/crane.errors'
import type { DbContext } from '@/shared/database/client'

export interface AssignCraneCommand {
  orgId: string
  craneId: string
  berthId: string
  portCallId: string
  plannedStart: Date
  plannedEnd: Date
  assignedMoves?: number | undefined
  notes?: string | undefined
}

export interface AssignCraneResult {
  assignmentId: string
  craneId: string
  berthId: string
  portCallId: string
}

export async function assignCraneCommand(
  cmd: AssignCraneCommand,
  db: DbContext
): Promise<AssignCraneResult> {
  const [crane] = await db.select().from(cranes)
    .where(and(eq(cranes.id, cmd.craneId), eq(cranes.orgId, cmd.orgId)))
    .limit(1)

  if (!crane) throw new CraneNotFoundError(cmd.craneId)
  if (crane.status !== 'AVAILABLE') throw new CraneNotAvailableError(cmd.craneId, crane.status)

  const id = generateId()
  await db.insert(equipmentAssignments).values({
    id,
    orgId: cmd.orgId,
    craneId: cmd.craneId,
    berthId: cmd.berthId,
    portCallId: cmd.portCallId,
    plannedStart: cmd.plannedStart,
    plannedEnd: cmd.plannedEnd,
    assignedMoves: cmd.assignedMoves ?? 0,
    completedMoves: 0,
    status: 'PLANNED',
    notes: cmd.notes,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  await db.update(cranes)
    .set({ status: 'OPERATING', currentBerthId: cmd.berthId, updatedAt: new Date() })
    .where(eq(cranes.id, cmd.craneId))

  await eventBus.emit('crane.assigned', {
    type: 'crane.assigned',
    assignmentId: id,
    orgId: cmd.orgId,
    craneId: cmd.craneId,
    berthId: cmd.berthId,
    portCallId: cmd.portCallId,
    occurredAt: new Date(),
  })

  return { assignmentId: id, craneId: cmd.craneId, berthId: cmd.berthId, portCallId: cmd.portCallId }
}
