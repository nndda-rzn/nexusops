import type { DbContext } from '@/shared/database/client'
import { operationDependencies } from '@/shared/database/schema/operations'
import { eq, and } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { ConflictError } from '@/shared/errors'
import { eventBus } from '@/shared/events'

export interface AddDependencyCommand {
  orgId: string
  operationId: string
  dependsOnId: string
  dependsOnOrgId: string
  dependencyType?:
    | 'FINISH_TO_START' | 'START_TO_START'
    | 'FINISH_TO_FINISH' | 'START_TO_FINISH'
    | undefined
  createdBy: string
}

export async function addDependencyCommand(
  cmd: AddDependencyCommand,
  db: DbContext
): Promise<void> {
  if (cmd.operationId === cmd.dependsOnId) {
    throw new ConflictError('An operation cannot depend on itself.',
      { operation_id: cmd.operationId })
  }

  const [reverse] = await db.select().from(operationDependencies)
    .where(and(
      eq(operationDependencies.operationId, cmd.dependsOnId),
      eq(operationDependencies.dependsOnId, cmd.operationId),
    )).limit(1)

  if (reverse) {
    throw new ConflictError('Adding this dependency would create a circular dependency.',
      { operation_id: cmd.operationId, depends_on_id: cmd.dependsOnId })
  }

  const depType = cmd.dependencyType ?? 'FINISH_TO_START'

  await db.insert(operationDependencies).values({
    id: generateId(),
    orgId: cmd.orgId,
    operationId: cmd.operationId,
    dependsOnId: cmd.dependsOnId,
    dependsOnOrgId: cmd.dependsOnOrgId,
    dependencyType: depType,
    createdBy: cmd.createdBy,
    createdAt: new Date(),
  })

  // L-05 FIX: emit event for dependency added
  await eventBus.emit('operation.dependency_added', {
    type: 'operation.dependency_added',
    orgId: cmd.orgId,
    operationId: cmd.operationId,
    dependsOnId: cmd.dependsOnId,
    dependsOnOrgId: cmd.dependsOnOrgId,
    dependencyType: depType,
    occurredAt: new Date(),
    actorId: cmd.createdBy,
  })
}
