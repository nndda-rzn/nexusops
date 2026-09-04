import type { DbContext } from '@/shared/database/client'
import { operationDependencies } from '@/shared/database/schema/operations'
import { eq, and } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { ConflictError } from '@/shared/errors'

export interface AddDependencyCommand {
  orgId: string
  operationId: string
  dependsOnId: string
  dependsOnOrgId: string
  dependencyType?: 'FINISH_TO_START' | 'START_TO_START' | 'FINISH_TO_FINISH' | 'START_TO_FINISH' | undefined
  createdBy: string
}

export async function addDependencyCommand(
  cmd: AddDependencyCommand,
  db: DbContext
): Promise<void> {
  // Prevent self-dependency
  if (cmd.operationId === cmd.dependsOnId) {
    throw new ConflictError('An operation cannot depend on itself.', {
      operation_id: cmd.operationId,
    })
  }

  // Check for circular dependency (A→B and B→A)
  const [reverse] = await db
    .select()
    .from(operationDependencies)
    .where(and(
      eq(operationDependencies.operationId, cmd.dependsOnId),
      eq(operationDependencies.dependsOnId, cmd.operationId),
    ))
    .limit(1)

  if (reverse) {
    throw new ConflictError('Adding this dependency would create a circular dependency.', {
      operation_id: cmd.operationId,
      depends_on_id: cmd.dependsOnId,
    })
  }

  await db.insert(operationDependencies).values({
    id: generateId(),
    orgId: cmd.orgId,
    operationId: cmd.operationId,
    dependsOnId: cmd.dependsOnId,
    dependsOnOrgId: cmd.dependsOnOrgId,
    dependencyType: cmd.dependencyType ?? 'FINISH_TO_START',
    createdBy: cmd.createdBy,
    createdAt: new Date(),
  })
}
