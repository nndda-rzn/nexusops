import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext, requireModule } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import {
  createPlanFromScenarioCommand, addScheduleEntriesCommand,
  approvePlanCommand, activatePlanCommand, archivePlanCommand,
} from '@/modules/planning/application/commands/plan-lifecycle.commands'
import { createScenarioCommand, selectScenarioCommand } from '@/modules/planning/application/commands/scenario.commands'
import { listScenariosQuery } from '@/modules/planning/infrastructure/repositories/plan.repository'
import { listPlansQuery } from '@/modules/planning/infrastructure/repositories/plan.repository'
import { listPlanSchedules } from '@/modules/planning/infrastructure/repositories/schedule.repository'
import type { PlanType } from '@/modules/planning/domain/entities/plan.entity'

const PLAN_TYPES = t.Union([
  t.Literal('BERTH'), t.Literal('CRANE'), t.Literal('YARD'),
  t.Literal('WORKFORCE'), t.Literal('ROUTE'), t.Literal('TRAIN'), t.Literal('NETWORK'),
])

export const planningPlansRoutes = new Elysia({ prefix: '/planning' })
  .use(authMiddleware)
  .onBeforeHandle(requireModule('planning'))

  // ─── Scenarios ───
  .post('/scenarios', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      createScenarioCommand({
        orgId: user.orgId, planType: body.plan_type as PlanType,
        name: body.name, optimizationJobId: body.optimization_job_id,
        createdBy: user.id,
        ...(body.description ? { description: body.description } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      plan_type: PLAN_TYPES,
      name: t.String(),
      optimization_job_id: t.String(),
      description: t.Optional(t.String()),
    }),
    detail: { tags: ['Planning'], summary: 'Create scenario from completed job' },
  })

  .get('/scenarios', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listScenariosQuery(user.orgId, db, {
        ...(query.status ? { status: query.status as never } : {}),
        ...(query.plan_type ? { planType: query.plan_type as PlanType } : {}),
      })
    )
    return { data: result }
  }, {
    query: t.Object({
      status: t.Optional(t.String()),
      plan_type: t.Optional(t.String()),
    }),
    detail: { tags: ['Planning'], summary: 'List scenarios' },
  })

  .post('/scenarios/:id/select', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      selectScenarioCommand({ orgId: user.orgId, scenarioId: params.id, actorId: user.id }, db)
    )
    return { data: { message: 'Scenario selected.' } }
  }, { detail: { tags: ['Planning'], summary: 'Select scenario' } })

  // ─── Plans ───
  .post('/plans', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      createPlanFromScenarioCommand({
        orgId: user.orgId, scenarioId: body.scenario_id,
        name: body.name, createdBy: user.id,
        ...(body.valid_from ? { validFrom: new Date(body.valid_from) } : {}),
        ...(body.valid_until ? { validUntil: new Date(body.valid_until) } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      scenario_id: t.String(),
      name: t.String(),
      valid_from: t.Optional(t.String()),
      valid_until: t.Optional(t.String()),
    }),
    detail: { tags: ['Planning'], summary: 'Create plan from selected scenario' },
  })

  .get('/plans', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listPlansQuery(user.orgId, db, {
        ...(query.status ? { status: query.status as never } : {}),
        ...(query.plan_type ? { planType: query.plan_type as PlanType } : {}),
      })
    )
    return { data: result }
  }, {
    query: t.Object({
      status: t.Optional(t.String()),
      plan_type: t.Optional(t.String()),
    }),
    detail: { tags: ['Planning'], summary: 'List plans' },
  })

  .get('/plans/:id/schedules', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => listPlanSchedules(params.id, user.orgId, db))
    return { data: result }
  }, { detail: { tags: ['Planning'], summary: 'List plan schedules' } })

  .post('/plans/:id/schedules', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      addScheduleEntriesCommand({
        orgId: user.orgId, planId: params.id, actorId: user.id,
        entries: body.entries.map((e) => ({
          resourceType: e.resource_type, resourceId: e.resource_id,
          startTime: new Date(e.start_time), endTime: new Date(e.end_time),
          ...(e.operation_id ? { operationId: e.operation_id } : {}),
          ...(e.metadata ? { metadata: e.metadata } : {}),
        })),
      }, db)
    )
    return { data: { message: 'Schedule entries added.' } }
  }, {
    body: t.Object({
      entries: t.Array(t.Object({
        resource_type: t.String(),
        resource_id: t.String(),
        start_time: t.String(),
        end_time: t.String(),
        operation_id: t.Optional(t.String()),
        metadata: t.Optional(t.Any()),
      })),
    }),
    detail: { tags: ['Planning'], summary: 'Add schedule entries to plan' },
  })

  .post('/plans/:id/approve', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      approvePlanCommand({ orgId: user.orgId, planId: params.id, approvedBy: user.id }, db)
    )
    return { data: { message: 'Plan approved.' } }
  }, { detail: { tags: ['Planning'], summary: 'Approve plan' } })

  .post('/plans/:id/activate', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      activatePlanCommand({ orgId: user.orgId, planId: params.id, activatedBy: user.id }, db)
    )
    return { data: { message: 'Plan activated.' } }
  }, { detail: { tags: ['Planning'], summary: 'Activate plan (conflict-checked)' } })

  .post('/plans/:id/archive', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) => archivePlanCommand({ orgId: user.orgId, planId: params.id, actorId: user.id }, db))
    return { data: { message: 'Plan archived.' } }
  }, { detail: { tags: ['Planning'], summary: 'Archive plan' } })