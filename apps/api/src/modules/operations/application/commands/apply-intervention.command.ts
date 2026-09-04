import { operations, operationResources } from '@/shared/database/schema/operations'
import { eq, and } from 'drizzle-orm'
import { findOperationByIdOrFail, saveOperation } from '@/modules/operations/infrastructure/repositories/operation.repository'
import { eventBus } from '@/shared/events'
import { logger } from '@/shared/logging'
import type { DbContext } from '@/shared/database/client'
import type { OperationPriority } from '@/modules/operations/domain/entities/operation.entity'

export interface ApplyInterventionCommand {
  operationId: string
  orgId: string
  interventionType: string
  proposedChanges: Record<string, unknown>
  executedBy: string
}

export async function applyInterventionCommand(
  cmd: ApplyInterventionCommand,
  db: DbContext
): Promise<void> {
  const operation = await findOperationByIdOrFail(cmd.operationId, cmd.orgId, db)

  switch (cmd.interventionType) {
    case 'RESCHEDULE': {
      const { scheduledStart, scheduledEnd } = cmd.proposedChanges as {
        scheduledStart?: string | undefined
        scheduledEnd?: string | undefined
      }
      if (scheduledStart || scheduledEnd) {
        await db.update(operations)
          .set({
            ...(scheduledStart ? { scheduledStart: new Date(scheduledStart) } : {}),
            ...(scheduledEnd ? { scheduledEnd: new Date(scheduledEnd) } : {}),
            updatedAt: new Date(),
          })
          .where(and(eq(operations.id, cmd.operationId), eq(operations.orgId, cmd.orgId)))
      }
      break
    }
    case 'REPRIORITIZE': {
      const { priority } = cmd.proposedChanges as { priority?: string | undefined }
      if (priority) {
        operation.reprioritize(priority as OperationPriority)
        await saveOperation(operation, db)
      }
      break
    }
    case 'CANCEL':
    case 'EMERGENCY_STOP': {
      const reason = cmd.interventionType === 'EMERGENCY_STOP'
        ? 'Emergency stop via Holding intervention'
        : 'Cancelled via Holding intervention'
      operation.cancel(cmd.executedBy, reason)
      await saveOperation(operation, db)
      await eventBus.emit('operation.cancelled', {
        type: 'operation.cancelled',
        operationId: operation.id,
        orgId: operation.orgId,
        operationType: operation.type,
        reason,
        cancelledBy: cmd.executedBy,
        occurredAt: new Date(),
      })
      break
    }
    case 'REALLOCATE': {
      const { resourceType, newResourceId } = cmd.proposedChanges as {
        resourceType?: string | undefined
        newResourceId?: string | undefined
      }
      if (resourceType && newResourceId) {
        await db.update(operationResources)
          .set({ resourceId: newResourceId })
          .where(and(
            eq(operationResources.operationId, cmd.operationId),
            eq(operationResources.resourceType, resourceType),
          ))
      }
      break
    }
    default:
      logger.warn('Unknown intervention type, skipping execution', {
        intervention_type: cmd.interventionType,
        operation_id: cmd.operationId,
      })
  }

  logger.info('Intervention applied', {
    operation_id: cmd.operationId,
    intervention_type: cmd.interventionType,
    executed_by: cmd.executedBy,
  })
}
