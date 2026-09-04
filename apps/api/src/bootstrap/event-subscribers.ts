import { eventBus } from '@/shared/events'
import { applyInterventionCommand } from '@/modules/operations/application/commands/apply-intervention.command'
import { db } from '@/shared/database/client'
import { logger } from '@/shared/logging'
import type { InterventionExecutedEvent } from '@/modules/operations/domain/events/operation.events'

// ─────────────────────────────────────────
// Register all domain event subscribers
// Called once at application startup
// ─────────────────────────────────────────

export function registerEventSubscribers(): void {
  // L-02 FIX: Intervention execution via event subscription
  // When intervention is approved/auto-approved, apply proposedChanges to operation
  eventBus.on<InterventionExecutedEvent>(
    'operation.intervention_executed',
    async (event) => {
      try {
        await applyInterventionCommand({
          operationId: event.operationId,
          orgId: event.orgId,
          interventionType: event.interventionType,
          proposedChanges: event.proposedChanges,
          executedBy: event.respondedBy ?? 'SYSTEM',
        }, db)
      } catch (err) {
        logger.error('Failed to apply intervention', {
          intervention_id: event.interventionId,
          operation_id: event.operationId,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
  )

  logger.info('Event subscribers registered')
}
