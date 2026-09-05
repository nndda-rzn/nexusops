import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext, requireModule } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { parsePaginationQuery } from '@/shared/pagination/query-helpers'
import { requestOptimizationCommand, cancelOptimizationCommand, retryOptimizationCommand } from '@/modules/planning/application/commands/optimization-job.commands'
import { getOptimizationJobQuery, listOptimizationJobsQuery, listOptimizationJobEventsQuery } from '@/modules/planning/application/queries/optimization-job.queries'
import type { OptimizationJobStatus, OptimizationJobType } from '@/modules/planning/domain/entities/optimization-job.entity'

const JOB_TYPES = t.Union([
  t.Literal('YARD_OPTIMIZATION'), t.Literal('BERTH_SCHEDULING'),
  t.Literal('CRANE_SCHEDULING'), t.Literal('WORKFORCE_SCHEDULING'),
  t.Literal('ROUTE_OPTIMIZATION'), t.Literal('TRAIN_SCHEDULING'),
  t.Literal('NETWORK_ANALYSIS'), t.Literal('CRITICAL_PATH'), t.Literal('DELAY_PROPAGATION'),
])

export const planningRoutes = new Elysia({ prefix: '/planning' })
  .use(authMiddleware)
  .onBeforeHandle(requireModule('planning'))

  .post('/optimization-jobs', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      requestOptimizationCommand({
        orgId: user.orgId, jobType: body.job_type,
        input: body.input,
        createdBy: user.id,
        ...(body.idempotency_key ? { idempotencyKey: body.idempotency_key } : {}),
        ...(body.max_retries !== undefined ? { maxRetries: body.max_retries } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      job_type:         JOB_TYPES,
      input:            t.Any(),
      idempotency_key:  t.Optional(t.String()),
      max_retries:      t.Optional(t.Number({ minimum: 1, maximum: 10 })),
    }),
    detail: { tags: ['Planning'], summary: 'Request optimization job (async)' },
  })

  .get('/optimization-jobs', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listOptimizationJobsQuery(user.orgId, db, {
        ...parsePaginationQuery(query),
        ...(query.status ? { status: query.status as OptimizationJobStatus } : {}),
        ...(query.job_type ? { jobType: query.job_type as OptimizationJobType } : {}),
      })
    )
    return result
  }, {
    query: t.Object({
      page:     t.Optional(t.String()),
      limit:    t.Optional(t.String()),
      status:   t.Optional(t.String()),
      job_type: t.Optional(t.String()),
    }),
    detail: { tags: ['Planning'], summary: 'List optimization jobs' },
  })

  .get('/optimization-jobs/:id', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const job = await withDbContext(user, (db) => getOptimizationJobQuery(params.id, user.orgId, db))
    return { data: job.toSnapshot() }
  }, { detail: { tags: ['Planning'], summary: 'Get optimization job by ID' } })

  .get('/optimization-jobs/:id/events', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => listOptimizationJobEventsQuery(params.id, user.orgId, db))
    return { data: result }
  }, { detail: { tags: ['Planning'], summary: 'List optimization job events' } })

  .post('/optimization-jobs/:id/cancel', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      cancelOptimizationCommand({ jobId: params.id, orgId: user.orgId, cancelledBy: user.id }, db)
    )
    return { data: { message: 'Optimization job cancelled.' } }
  }, { detail: { tags: ['Planning'], summary: 'Cancel optimization job' } })

  .post('/optimization-jobs/:id/retry', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      retryOptimizationCommand({ jobId: params.id, orgId: user.orgId, actorId: user.id }, db)
    )
    return { data: { message: 'Optimization job re-queued.' } }
  }, { detail: { tags: ['Planning'], summary: 'Retry failed optimization job' } })
