import type { DbContext } from '@/shared/database/client'
import { interventionRequests } from '@/shared/database/schema/operations'
import { eq, and } from 'drizzle-orm'
import { NotFoundError, ConflictError } from '@/shared/errors'
import { eventBus } from '@/shared/events'
import type { InterventionExecutedEvent } from '@/modules/operations/domain/events/operation.events'

export interface RespondInterventionCommand {
  interventionId: string
  respondedBy: string
  response: 'APPROVE' | 'REJECT'
  rejectionReason?: string | undefined
  targetOrgId: string
}

export async function respondInterventionCommand(
  cmd: RespondInterventionCommand,
  db: DbContext
): Promise<void> {
  const [intervention] = await db
    .select()
    .from(interventionRequests)
    .where(and(
      eq(interventionRequests.id, cmd.interventionId),
      eq(interventionRequests.targetOrgId, cmd.targetOrgId),
    ))
    .limit(1)

  if (!intervention) throw new NotFoundError('InterventionRequest', cmd.interventionId)

  if (intervention.status !== 'PENDING') {
    throw new ConflictError(
      `Intervention request is already ${intervention.status}.`,
      { status: intervention.status }
    )
  }

  const newStatus = cmd.response === 'APPROVE' ? 'APPROVED' : 'REJECTED'
  const now = new Date()

  await db.update(interventionRequests)
    .set({
      status: newStatus,
      respondedBy: cmd.respondedBy,
      respondedAt: now,
      ...(cmd.response === 'APPROVE' ? { executedAt: now } : {}),
      ...(cmd.rejectionReason ? { executionNotes: cmd.rejectionReason } : {}),
    })
    .where(eq(interventionRequests.id, cmd.interventionId))

  if (cmd.response === 'APPROVE') {
    const event: InterventionExecutedEvent = {
      type: 'operation.intervention_executed',
      interventionId: cmd.interventionId,
      orgId: intervention.orgId,
      targetOrgId: intervention.targetOrgId,
      operationId: intervention.operationId,
      interventionType: intervention.interventionType,
      proposedChanges: intervention.proposedChanges as Record<string, unknown> ?? {},
      occurredAt: now,
      executedAt: now,
      wasAutoApproved: false,
      respondedBy: cmd.respondedBy,
    }
    await eventBus.emit('operation.intervention_executed', event)
  } else {
    // L-04 FIX: emit rejection event
    await eventBus.emit('operation.intervention_rejected', {
      type: 'operation.intervention_rejected',
      interventionId: cmd.interventionId,
      orgId: intervention.orgId,
      targetOrgId: intervention.targetOrgId,
      operationId: intervention.operationId,
      rejectedBy: cmd.respondedBy,
      rejectionReason: cmd.rejectionReason,
      occurredAt: now,
    })
  }
}
