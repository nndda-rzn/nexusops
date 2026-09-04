import type { DbContext } from '@/shared/database/client'
import { interventionRequests } from '@/shared/database/schema/operations'
import { eq, and, lt } from 'drizzle-orm'
import { eventBus } from '@/shared/events'
import { logger } from '@/shared/logging'
import type { InterventionExecutedEvent } from '@/modules/operations/domain/events/operation.events'

// ─────────────────────────────────────────
// Auto-approve expired intervention requests (SLA exceeded)
// Called by a background job / scheduler
// ─────────────────────────────────────────

export async function processExpiredInterventionsCommand(
  db: DbContext
): Promise<number> {
  const now = new Date()

  const expired = await db
    .select()
    .from(interventionRequests)
    .where(and(
      eq(interventionRequests.status, 'PENDING'),
      lt(interventionRequests.slaDeadline, now),
    ))

  if (expired.length === 0) return 0

  for (const intervention of expired) {
    await db.update(interventionRequests)
      .set({
        status: 'AUTO_APPROVED',
        respondedAt: now,
        executedAt: now,
        executionNotes: 'Auto-approved: SLA deadline exceeded (15 minutes)',
      })
      .where(eq(interventionRequests.id, intervention.id))

    const event: InterventionExecutedEvent = {
      type: 'operation.intervention_executed',
      interventionId: intervention.id,
      orgId: intervention.orgId,
      targetOrgId: intervention.targetOrgId,
      operationId: intervention.operationId,
      interventionType: intervention.interventionType,
      proposedChanges: intervention.proposedChanges as Record<string, unknown> ?? {},
      occurredAt: now,
      executedAt: now,
      wasAutoApproved: true,
      respondedBy: 'SYSTEM',
    }

    await eventBus.emit('operation.intervention_executed', event)

    logger.info('Intervention auto-approved', {
      intervention_id: intervention.id,
      operation_id: intervention.operationId,
      target_org: intervention.targetOrgId,
    })
  }

  return expired.length
}
