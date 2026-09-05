import { plans, scenarios } from '@/shared/database/schema/planning'
import { eq, and, sql } from 'drizzle-orm'
import { Plan } from '@/modules/planning/domain/entities/plan.entity'
import { Scenario } from '@/modules/planning/domain/entities/scenario.entity'
import { PlanNotFoundError, ScenarioNotFoundError } from '@/modules/planning/domain/errors/planning.errors'
import type { PlanStatus, PlanType } from '@/modules/planning/domain/entities/plan.entity'
import type { ScenarioPlanType, ScenarioStatus } from '@/modules/planning/domain/entities/scenario.entity'
import type { DbContext } from '@/shared/database/client'

type PlanRow = typeof plans.$inferSelect
type ScenarioRow = typeof scenarios.$inferSelect

function planRowToEntity(row: PlanRow): Plan {
  return Plan.fromSnapshot({
    id: row.id, orgId: row.orgId, name: row.name,
    planType: row.planType, status: row.status,
    validFrom: row.validFrom ?? undefined,
    validUntil: row.validUntil ?? undefined,
    optimizationJobId: row.optimizationJobId ?? undefined,
    scenarioId: row.scenarioId ?? undefined,
    createdBy: row.createdBy,
    approvedBy: row.approvedBy ?? undefined,
    approvedAt: row.approvedAt ?? undefined,
    activatedAt: row.activatedAt ?? undefined,
    supersededBy: row.supersededBy ?? undefined,
    createdAt: row.createdAt, updatedAt: row.updatedAt,
  })
}

function scenarioRowToEntity(row: ScenarioRow): Scenario {
  return Scenario.fromSnapshot({
    id: row.id, orgId: row.orgId, planType: row.planType,
    name: row.name, description: row.description ?? undefined,
    optimizationJobId: row.optimizationJobId ?? undefined,
    metrics: row.metrics ?? undefined,
    status: row.status, createdBy: row.createdBy, createdAt: row.createdAt,
  })
}

export async function insertPlan(plan: Plan, db: DbContext): Promise<void> {
  const s = plan.toSnapshot()
  await db.insert(plans).values({
    id: s.id, orgId: s.orgId, name: s.name, planType: s.planType,
    status: s.status, validFrom: s.validFrom ?? null, validUntil: s.validUntil ?? null,
    optimizationJobId: s.optimizationJobId ?? null, scenarioId: s.scenarioId ?? null,
    createdBy: s.createdBy, approvedBy: s.approvedBy ?? null,
    approvedAt: s.approvedAt ?? null, activatedAt: s.activatedAt ?? null,
    supersededBy: s.supersededBy ?? null, createdAt: s.createdAt, updatedAt: s.updatedAt,
  })
}

export async function findPlanById(id: string, orgId: string, db: DbContext): Promise<Plan | null> {
  const [row] = await db.select().from(plans)
    .where(and(eq(plans.id, id), eq(plans.orgId, orgId))).limit(1)
  return row ? planRowToEntity(row) : null
}

export async function findPlanByIdOrFail(id: string, orgId: string, db: DbContext): Promise<Plan> {
  const plan = await findPlanById(id, orgId, db)
  if (!plan) throw new PlanNotFoundError(id)
  return plan
}

export async function savePlan(plan: Plan, db: DbContext): Promise<void> {
  const s = plan.toSnapshot()
  await db.update(plans).set({
    status: s.status, approvedBy: s.approvedBy ?? null,
    approvedAt: s.approvedAt ?? null, activatedAt: s.activatedAt ?? null,
    supersededBy: s.supersededBy ?? null,
    validFrom: s.validFrom ?? null, validUntil: s.validUntil ?? null,
    updatedAt: s.updatedAt,
  }).where(and(eq(plans.id, s.id), eq(plans.orgId, s.orgId)))
}

export async function listPlansQuery(
  orgId: string, db: DbContext,
  params?: { status?: PlanStatus; planType?: PlanType }
) {
  const conditions = [eq(plans.orgId, orgId)]
  if (params?.status) conditions.push(eq(plans.status, params.status))
  if (params?.planType) conditions.push(eq(plans.planType, params.planType))
  return db.select().from(plans).where(and(...conditions)).orderBy(sql`${plans.createdAt} desc`)
}

export async function findActivePlansForType(orgId: string, planType: PlanType, db: DbContext): Promise<PlanRow[]> {
  return db.select().from(plans)
    .where(and(eq(plans.orgId, orgId), eq(plans.planType, planType), eq(plans.status, 'ACTIVE')))
}

// ─── Scenarios ───

export async function insertScenario(scenario: Scenario, db: DbContext): Promise<void> {
  const s = scenario.toSnapshot()
  await db.insert(scenarios).values({
    id: s.id, orgId: s.orgId, planType: s.planType,
    name: s.name, description: s.description ?? null,
    optimizationJobId: s.optimizationJobId ?? null,
    metrics: s.metrics ?? null, status: s.status,
    createdBy: s.createdBy, createdAt: s.createdAt,
  })
}

export async function findScenarioById(id: string, orgId: string, db: DbContext): Promise<Scenario | null> {
  const [row] = await db.select().from(scenarios)
    .where(and(eq(scenarios.id, id), eq(scenarios.orgId, orgId))).limit(1)
  return row ? scenarioRowToEntity(row) : null
}

export async function findScenarioByIdOrFail(id: string, orgId: string, db: DbContext): Promise<Scenario> {
  const scenario = await findScenarioById(id, orgId, db)
  if (!scenario) throw new ScenarioNotFoundError(id)
  return scenario
}

export async function saveScenario(scenario: Scenario, db: DbContext): Promise<void> {
  const s = scenario.toSnapshot()
  await db.update(scenarios).set({ status: s.status }).where(and(eq(scenarios.id, s.id), eq(scenarios.orgId, s.orgId)))
}

export async function listScenariosQuery(
  orgId: string, db: DbContext,
  params?: { status?: ScenarioStatus; planType?: ScenarioPlanType }
) {
  const conditions = [eq(scenarios.orgId, orgId)]
  if (params?.status) conditions.push(eq(scenarios.status, params.status))
  if (params?.planType) conditions.push(eq(scenarios.planType, params.planType))
  return db.select().from(scenarios).where(and(...conditions)).orderBy(sql`${scenarios.createdAt} desc`)
}

