import type { DbContext } from '@/shared/database/client'
import { operationDependencies } from '@/shared/database/schema/operations'
import { eq, and } from 'drizzle-orm'
import { NotFoundError } from '@/shared/errors'
import { eventBus } from '@/shared/events'

export interface RemoveDependencyCommand {
  orgId: string
  operationId: string
  dependsOnId: string
}

export async function removeDependencyCommand(
  cmd: RemoveDependencyCommand,
  db: DbContext
): Promise<void> {
  const [existing] = await db.select().from(operationDependencies)
    .where(and(
      eq(operationDependencies.orgId, cmd.orgId),
      eq(operationDependencies.operationId, cmd.operationId),
      eq(operationDependencies.dependsOnId, cmd.dependsOnId),
    )).limit(1)

  if (!existing) {
    throw new NotFoundError('OperationDependency', `${cmd.operationId}->${cmd.dependsOnId}`)
  }

  await db.delete(operationDependencies)
    .where(and(
      eq(operationDependencies.orgId, cmd.orgId),
      eq(operationDependencies.operationId, cmd.operationId),
      eq(operationDependencies.dependsOnId, cmd.dependsOnId),
    ))

  // L-05 FIX: emit event for dependency removed
  await eventBus.emit('operation.dependency_removed', {
    type: 'operation.dependency_removed',
    orgId: cmd.orgId,
    operationId: cmd.operationId,
    dependsOnId: cmd.dependsOnId,
    occurredAt: new Date(),
    actorId: cmd.orgId,
  })
}
