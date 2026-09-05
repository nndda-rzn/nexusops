import { generateId } from '@/shared/ids'
import { eventBus } from '@/shared/events'
import { DomainError } from '@/shared/errors'
import { findOptimizationJobByIdOrFail } from '@/modules/planning/infrastructure/repositories/optimization-job.repository'
import { Scenario } from '@/modules/planning/domain/entities/scenario.entity'
import { insertScenario, findScenarioByIdOrFail, saveScenario } from '@/modules/planning/infrastructure/repositories/plan.repository'
import type { PlanType } from '@/modules/planning/domain/entities/plan.entity'
import type { DbContext } from '@/shared/database/client'

// ─── Scenario from a completed optimization job ───

export interface CreateScenarioCommand {
  orgId: string
  planType: PlanType
  name: string
  description?: string | undefined
  optimizationJobId: string
  createdBy: string
}

export async function createScenarioCommand(cmd: CreateScenarioCommand, db: DbContext): Promise<{ id: string }> {
  const job = await findOptimizationJobByIdOrFail(cmd.optimizationJobId, cmd.orgId, db)
  if (job.status !== 'COMPLETED') {
    throw new DomainError('job-not-completed', 'Job Not Completed',
      `Scenario requires a COMPLETED optimization job (current: '${job.status}').`,
      { job_id: cmd.optimizationJobId, status: job.status })
  }

  const id = generateId()
  const metrics = extractJobMetrics(job.result)
  const scenario = Scenario.fromSnapshot({
    id, orgId: cmd.orgId, planType: cmd.planType,
    name: cmd.name, description: cmd.description,
    optimizationJobId: cmd.optimizationJobId,
    metrics, status: 'CANDIDATE',
    createdBy: cmd.createdBy, createdAt: new Date(),
  })
  await insertScenario(scenario, db)
  return { id }
}

function extractJobMetrics(result: unknown): Record<string, number | string> | null {
  if (!result || typeof result !== 'object') return null
  const r = result as Record<string, unknown>
  if (typeof r.metrics === 'object' && r.metrics !== null) return r.metrics as Record<string, number | string>
  if (typeof r.status === 'string' && r.status !== 'INFEASIBLE') {
    const metrics: Record<string, number | string> = { status: r.status }
    if (Array.isArray(r.assignments)) metrics.assignments = r.assignments.length
    if (Array.isArray(r.unassigned_containers)) metrics.unassigned = r.unassigned_containers.length
    return metrics
  }
  return null
}

// ─── Select scenario ───

export async function selectScenarioCommand(
  cmd: { orgId: string; scenarioId: string; actorId: string }, db: DbContext
): Promise<void> {
  const scenario = await findScenarioByIdOrFail(cmd.scenarioId, cmd.orgId, db)
  scenario.select()
  await saveScenario(scenario, db)
  await eventBus.emit('planning.scenario_selected', {
    type: 'planning.scenario_selected',
    scenarioId: cmd.scenarioId, orgId: cmd.orgId,
    planType: scenario.toSnapshot().planType, occurredAt: new Date(),
    selectedBy: cmd.actorId,
  })
}