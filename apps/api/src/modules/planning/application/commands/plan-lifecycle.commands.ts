import { generateId } from '@/shared/ids'
import { eventBus } from '@/shared/events'
import { DomainError } from '@/shared/errors'
import { Plan } from '@/modules/planning/domain/entities/plan.entity'
import {
  insertPlan, findPlanByIdOrFail, savePlan, findActivePlansForType,
} from '@/modules/planning/infrastructure/repositories/plan.repository'
import { findScenarioByIdOrFail } from '@/modules/planning/infrastructure/repositories/plan.repository'
import { insertScheduleEntries, listPlanSchedules, findResourceOverlaps } from '@/modules/planning/infrastructure/repositories/schedule.repository'
import { PlanScheduleConflictError } from '@/modules/planning/domain/errors/planning.errors'
import type { DbContext } from '@/shared/database/client'

// ─── Create plan (DRAFT) from selected scenario ───

export interface CreatePlanFromScenarioCommand {
  orgId: string
  scenarioId: string
  name: string
  validFrom?: Date | undefined
  validUntil?: Date | undefined
  createdBy: string
}

export async function createPlanFromScenarioCommand(cmd: CreatePlanFromScenarioCommand, db: DbContext): Promise<{ id: string }> {
  const scenario = await findScenarioByIdOrFail(cmd.scenarioId, cmd.orgId, db)
  const snap = scenario.toSnapshot()
  if (snap.status !== 'SELECTED') {
    throw new DomainError('scenario-not-selected', 'Scenario Not Selected',
      `Plan can only be created from a SELECTED scenario (current: '${snap.status}').`,
      { scenario_id: cmd.scenarioId })
  }

  const id = generateId()
  const now = new Date()
  const plan = Plan.create({
    id, orgId: cmd.orgId, name: cmd.name, planType: snap.planType,
    status: 'DRAFT',
    validFrom: cmd.validFrom ?? now,
    validUntil: cmd.validUntil,
    optimizationJobId: snap.optimizationJobId,
    scenarioId: cmd.scenarioId,
    createdBy: cmd.createdBy, createdAt: now, updatedAt: now,
  })
  await insertPlan(plan, db)
  return { id }
}

// ─── Add schedule entries ───

export interface ScheduleEntryInput {
  resourceType: string
  resourceId: string
  startTime: Date
  endTime: Date
  operationId?: string | undefined
  metadata?: unknown | undefined
}

export async function addScheduleEntriesCommand(
  cmd: { orgId: string; planId: string; entries: ScheduleEntryInput[]; actorId: string }, db: DbContext
): Promise<void> {
  const plan = await findPlanByIdOrFail(cmd.planId, cmd.orgId, db)
  if (plan.status !== 'DRAFT') {
    throw new DomainError('plan-not-draft', 'Plan Not Draft',
      `Schedule entries can only be added to DRAFT plans (current: '${plan.status}').`,
      { plan_id: cmd.planId })
  }
  const entries: Array<{
    resourceType: string; resourceId: string; startTime: Date; endTime: Date;
    operationId?: string; metadata?: unknown
  }> = cmd.entries.map((e) => ({
    resourceType: e.resourceType, resourceId: e.resourceId,
    startTime: e.startTime, endTime: e.endTime,
    ...(e.operationId !== undefined ? { operationId: e.operationId } : {}),
    ...(e.metadata !== undefined ? { metadata: e.metadata } : {}),
  }))
  await insertScheduleEntries(cmd.orgId, cmd.planId, entries, db)
}

// ─── Lifecycle ───

export async function approvePlanCommand(
  cmd: { orgId: string; planId: string; approvedBy: string }, db: DbContext
): Promise<void> {
  const plan = await findPlanByIdOrFail(cmd.planId, cmd.orgId, db)
  plan.approve(cmd.approvedBy)
  await savePlan(plan, db)
}

// Activate plan: check resource/time overlap against ACTIVE plans, then supersede.
export async function activatePlanCommand(
  cmd: { orgId: string; planId: string; activatedBy: string }, db: DbContext
): Promise<void> {
  await db.transaction(async (tx) => {
    const plan = await findPlanByIdOrFail(cmd.planId, cmd.orgId, tx)
    const snap = plan.toSnapshot()

    const entries = await listPlanSchedules(cmd.planId, cmd.orgId, tx)
    for (const e of entries) {
      const overlaps = await findResourceOverlaps(
        cmd.orgId, e.resourceType, e.resourceId, e.startTime, e.endTime, tx
      )
      for (const o of overlaps) {
        if (o.planId !== cmd.planId) {
          throw new PlanScheduleConflictError(
            `Resource '${e.resourceType}:${e.resourceId}' already scheduled ` +
            `${o.startTime.toISOString()}–${o.endTime.toISOString()} by plan '${o.planId}'.`,
            { resource_type: e.resourceType, resource_id: e.resourceId, conflicting_plan_id: o.planId }
          )
        }
      }
    }

    // supersede other ACTIVE plans of same type
    const actives = await findActivePlansForType(cmd.orgId, snap.planType, tx)
    for (const active of actives) {
      if (active.id === cmd.planId) continue
      const existing = await findPlanByIdOrFail(active.id, cmd.orgId, tx)
      existing.transition('SUPERSEDED')
      const existingSnap = existing.toSnapshot()
      await savePlan(Plan.fromSnapshot({ ...existingSnap, supersededBy: cmd.planId }), tx)
    }

    plan.activate()
    await savePlan(plan, tx)
  })

  await eventBus.emit('planning.plan_activated', {
    type: 'planning.plan_activated',
    planId: cmd.planId, orgId: cmd.orgId,
    planType: (await findPlanByIdOrFail(cmd.planId, cmd.orgId, db)).toSnapshot().planType,
    occurredAt: new Date(), activatedBy: cmd.activatedBy,
  })
}

export async function archivePlanCommand(
  cmd: { orgId: string; planId: string; actorId: string }, db: DbContext
): Promise<void> {
  const plan = await findPlanByIdOrFail(cmd.planId, cmd.orgId, db)
  plan.transition('ARCHIVED')
  await savePlan(plan, db)
}