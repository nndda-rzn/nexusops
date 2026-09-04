import type { DbContext } from '@/shared/database/client'
import { operationDependencies } from '@/shared/database/schema/operations'
import { eq, and } from 'drizzle-orm'
import { NotFoundError } from '@/shared/errors'

export interface RemoveDependencyCommand {
  orgId: string
  operationId: string
  dependsOnId: string
}

export async function removeDependencyCommand(
  cmd: RemoveDependencyCommand,
  db: DbContext
): Promise<void> {
  // Q-06 FIX: added orgId filter
  const [existing] = await db
    .select()
    .from(operationDependencies)
    .where(and(
      eq(operationDependencies.orgId, cmd.orgId),          // ← orgId filter added
      eq(operationDependencies.operationId, cmd.operationId),
      eq(operationDependencies.dependsOnId, cmd.dependsOnId),
    ))
    .limit(1)

  if (!existing) {
    throw new NotFoundError('OperationDependency', `${cmd.operationId}->${cmd.dependsOnId}`)
  }

  await db
    .delete(operationDependencies)
    .where(and(
      eq(operationDependencies.orgId, cmd.orgId),          // ← orgId filter added
      eq(operationDependencies.operationId, cmd.operationId),
      eq(operationDependencies.dependsOnId, cmd.dependsOnId),
    ))
}
