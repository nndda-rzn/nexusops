import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { startOperationCommand } from '@/modules/operations/application/commands/start-operation.command'
import { completeOperationCommand } from '@/modules/operations/application/commands/complete-operation.command'
import { cancelOperationCommand } from '@/modules/operations/application/commands/cancel-operation.command'
import { delayOperationCommand } from '@/modules/operations/application/commands/delay-operation.command'
import { createOperationCommand } from '@/modules/operations/application/commands/create-operation.command'
import { holdOperationCommand } from '@/modules/operations/application/commands/hold-operation.command'
import { resumeOperationCommand } from '@/modules/operations/application/commands/resume-operation.command'
import { reprioritizeOperationCommand } from '@/modules/operations/application/commands/reprioritize-operation.command'
import type { OperationType, OperationPriority } from '@/modules/operations/domain/entities/operation.entity'

export const operationCommandRoutes = new Elysia({ prefix: '/operations' })
  .use(authMiddleware)

  .post('/', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      createOperationCommand({
        orgId: user.orgId,
        type: body.type as OperationType,
        ...(body.reference_id ? { referenceId: body.reference_id } : {}),
        ...(body.reference_type ? { referenceType: body.reference_type } : {}),
        ...(body.scheduled_start ? { scheduledStart: new Date(body.scheduled_start) } : {}),
        ...(body.scheduled_end ? { scheduledEnd: new Date(body.scheduled_end) } : {}),
        priority: (body.priority ?? 'NORMAL') as OperationPriority,
        createdBy: user.id,
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      type:            t.String(),
      reference_id:    t.Optional(t.String()),
      reference_type:  t.Optional(t.String()),
      scheduled_start: t.Optional(t.String()),
      scheduled_end:   t.Optional(t.String()),
      priority:        t.Optional(t.String()),
    }),
    detail: { tags: ['Operations'], summary: 'Create operation' },
  })

  .post('/:id/start', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      startOperationCommand({ operationId: params.id, orgId: user.orgId, actorId: user.id }, db)
    )
    return { data: { message: 'Operation started.' } }
  }, {
    detail: { tags: ['Operations'], summary: 'Start operation' },
  })

  .post('/:id/complete', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      completeOperationCommand({ operationId: params.id, orgId: user.orgId, actorId: user.id }, db)
    )
    return { data: { message: 'Operation completed.' } }
  }, {
    detail: { tags: ['Operations'], summary: 'Complete operation' },
  })

  .post('/:id/cancel', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      cancelOperationCommand({
        operationId: params.id,
        orgId: user.orgId,
        reason: body.reason,
        actorId: user.id,
      }, db)
    )
    return { data: { message: 'Operation cancelled.' } }
  }, {
    body: t.Object({ reason: t.String({ minLength: 1 }) }),
    detail: { tags: ['Operations'], summary: 'Cancel operation' },
  })

  .post('/:id/delay', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      delayOperationCommand({
        operationId: params.id,
        orgId: user.orgId,
        delayMinutes: body.delay_minutes,
        actorId: user.id,
      }, db)
    )
    return { data: { message: 'Operation delayed.' } }
  }, {
    body: t.Object({ delay_minutes: t.Number({ minimum: 1 }) }),
    detail: { tags: ['Operations'], summary: 'Delay operation' },
  })

  .post('/:id/hold', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      holdOperationCommand({ operationId: params.id, orgId: user.orgId, actorId: user.id }, db)
    )
    return { data: { message: 'Operation put on hold.' } }
  }, { detail: { tags: ['Operations'], summary: 'Put operation on hold' } })

  .post('/:id/resume', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      resumeOperationCommand({ operationId: params.id, orgId: user.orgId, actorId: user.id }, db)
    )
    return { data: { message: 'Operation resumed.' } }
  }, { detail: { tags: ['Operations'], summary: 'Resume operation from hold' } })

  .post('/:id/reprioritize', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      reprioritizeOperationCommand({
        operationId: params.id, orgId: user.orgId,
        priority: body.priority as OperationPriority, actorId: user.id,
      }, db)
    )
    return { data: { message: 'Operation reprioritized.' } }
  }, {
    body: t.Object({
      priority: t.Union([t.Literal('LOW'), t.Literal('NORMAL'), t.Literal('HIGH'), t.Literal('CRITICAL')]),
    }),
    detail: { tags: ['Operations'], summary: 'Reprioritize operation' },
  })
