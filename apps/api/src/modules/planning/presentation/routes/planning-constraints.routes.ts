import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext, requireModule } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { addConstraintCommand, listConstraintsQuery, deleteConstraintCommand } from '@/modules/planning/application/commands/constraint.commands'
import type { PlanType } from '@/modules/planning/domain/entities/plan.entity'

const PLAN_TYPES = t.Union([
  t.Literal('BERTH'), t.Literal('CRANE'), t.Literal('YARD'),
  t.Literal('WORKFORCE'), t.Literal('ROUTE'), t.Literal('TRAIN'), t.Literal('NETWORK'),
])

export const planningConstraintsRoutes = new Elysia({ prefix: '/planning' })
  .use(authMiddleware)
  .onBeforeHandle(requireModule('planning'))

  .post('/constraints', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      addConstraintCommand({
        orgId: user.orgId, planType: body.plan_type as PlanType,
        constraintType: body.constraint_type, createdBy: user.id,
        ...(body.description ? { description: body.description } : {}),
        ...(body.value ? { value: body.value } : {}),
        ...(body.is_hard !== undefined ? { isHard: body.is_hard } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      plan_type: PLAN_TYPES,
      constraint_type: t.String(),
      description: t.Optional(t.String()),
      value: t.Optional(t.Any()),
      is_hard: t.Optional(t.Boolean()),
    }),
    detail: { tags: ['Planning'], summary: 'Add planning constraint' },
  })

  .get('/constraints', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listConstraintsQuery(user.orgId, db, query.plan_type ? query.plan_type as PlanType : undefined)
    )
    return { data: result }
  }, {
    query: t.Object({ plan_type: t.Optional(t.String()) }),
    detail: { tags: ['Planning'], summary: 'List planning constraints' },
  })

  .delete('/constraints/:id', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      deleteConstraintCommand({ orgId: user.orgId, constraintId: params.id }, db)
    )
    return { data: { message: 'Constraint deleted.' } }
  }, { detail: { tags: ['Planning'], summary: 'Delete planning constraint' } })