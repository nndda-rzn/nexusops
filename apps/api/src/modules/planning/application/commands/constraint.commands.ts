import { constraints } from '@/shared/database/schema/planning'
import { eq, and } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import type { PlanType } from '@/modules/planning/domain/entities/plan.entity'
import type { DbContext } from '@/shared/database/client'

export interface AddConstraintCommand {
  orgId: string
  planType: PlanType
  constraintType: string
  description?: string | undefined
  value?: unknown | undefined
  isHard?: boolean | undefined
  createdBy: string
}

export async function addConstraintCommand(cmd: AddConstraintCommand, db: DbContext): Promise<{ id: string }> {
  const id = generateId()
  await db.insert(constraints).values({
    id, orgId: cmd.orgId, planType: cmd.planType,
    constraintType: cmd.constraintType,
    description: cmd.description ?? null,
    value: cmd.value ?? null,
    isHard: cmd.isHard ?? true,
    createdBy: cmd.createdBy, createdAt: new Date(),
  })
  return { id }
}

export async function listConstraintsQuery(orgId: string, db: DbContext, planType?: PlanType) {
  const conditions = [eq(constraints.orgId, orgId)]
  if (planType) conditions.push(eq(constraints.planType, planType))
  return db.select().from(constraints).where(and(...conditions)).orderBy(constraints.createdAt)
}

export async function deleteConstraintCommand(cmd: { orgId: string; constraintId: string }, db: DbContext): Promise<void> {
  await db.delete(constraints)
    .where(and(eq(constraints.id, cmd.constraintId), eq(constraints.orgId, cmd.orgId)))
}