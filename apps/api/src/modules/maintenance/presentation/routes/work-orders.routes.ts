import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { parsePaginationQuery } from '@/shared/pagination/query-helpers'
import { listWorkOrdersQuery, getWorkOrderQuery } from '@/modules/maintenance/application/queries/maintenance.queries'
import { createWorkOrderCommand } from '@/modules/maintenance/application/commands/create-work-order.command'
import { approveWorkOrderCommand, assignWorkOrderCommand, startWorkOrderCommand, completeWorkOrderCommand, closeWorkOrderCommand, emergencyStartWorkOrderCommand } from '@/modules/maintenance/application/commands/work-order-lifecycle.command'

export const workOrdersRoutes = new Elysia({ prefix: '/maintenance' })
  .use(authMiddleware)

  .get('/work-orders', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listWorkOrdersQuery(user.orgId, db, {
        ...parsePaginationQuery(query),
        ...(query.status ? { status: query.status } : {}),
        ...(query.asset_id ? { assetId: query.asset_id } : {}),
      })
    )
    return result
  }, {
    query: t.Object({
      page:     t.Optional(t.String()),
      limit:    t.Optional(t.String()),
      asset_id: t.Optional(t.String()),
      status:   t.Optional(t.Union([
        t.Literal('DRAFT'), t.Literal('APPROVED'), t.Literal('SCHEDULED'),
        t.Literal('ASSIGNED'), t.Literal('IN_PROGRESS'), t.Literal('PENDING_PARTS'),
        t.Literal('COMPLETED'), t.Literal('CLOSED'),
      ])),
    }),
    detail: { tags: ['Maintenance'], summary: 'List work orders' },
  })

  .get('/work-orders/:id', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => getWorkOrderQuery(params.id, user.orgId, db))
    return { data: result }
  }, { detail: { tags: ['Maintenance'], summary: 'Get work order by ID' } })

  .post('/work-orders', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      createWorkOrderCommand({
        orgId: user.orgId, assetId: body.asset_id,
        type: body.type, title: body.title,
        ...(body.priority ? { priority: body.priority } : {}),
        ...(body.description ? { description: body.description } : {}),
        ...(body.scheduled_start ? { scheduledStart: new Date(body.scheduled_start) } : {}),
        ...(body.scheduled_end ? { scheduledEnd: new Date(body.scheduled_end) } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      asset_id:        t.String(),
      type:            t.Union([t.Literal('PREVENTIVE'), t.Literal('CORRECTIVE'), t.Literal('INSPECTION'), t.Literal('EMERGENCY')]),
      title:           t.String(),
      priority:        t.Optional(t.Union([t.Literal('LOW'), t.Literal('NORMAL'), t.Literal('HIGH'), t.Literal('CRITICAL')])),
      description:     t.Optional(t.String()),
      scheduled_start: t.Optional(t.String()),
      scheduled_end:   t.Optional(t.String()),
    }),
    detail: { tags: ['Maintenance'], summary: 'Create work order' },
  })

  .post('/work-orders/:id/approve', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      approveWorkOrderCommand({ workOrderId: params.id, orgId: user.orgId, approvedBy: user.id }, db)
    )
    return { data: { message: 'Work order approved.' } }
  }, { detail: { tags: ['Maintenance'], summary: 'Approve work order' } })

  .post('/work-orders/:id/assign', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      assignWorkOrderCommand({ workOrderId: params.id, orgId: user.orgId, assignedTo: body.assigned_to }, db)
    )
    return { data: { message: 'Work order assigned.' } }
  }, {
    body: t.Object({ assigned_to: t.String() }),
    detail: { tags: ['Maintenance'], summary: 'Assign work order to technician' },
  })

  .post('/work-orders/:id/start', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      startWorkOrderCommand({ workOrderId: params.id, orgId: user.orgId }, db)
    )
    return { data: { message: 'Work order started.' } }
  }, { detail: { tags: ['Maintenance'], summary: 'Start work order' } })

  // P3R-06 FIX: EMERGENCY work orders bypass approve/assign — start directly
  .post('/work-orders/:id/emergency-start', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      emergencyStartWorkOrderCommand({
        workOrderId: params.id, orgId: user.orgId, assignedTo: body.assigned_to,
      }, db)
    )
    return { data: { message: 'Emergency work order in progress.' } }
  }, {
    body: t.Object({ assigned_to: t.String() }),
    detail: { tags: ['Maintenance'], summary: 'Emergency-start work order' },
  })

  .post('/work-orders/:id/complete', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      completeWorkOrderCommand({ workOrderId: params.id, orgId: user.orgId }, db)
    )
    return { data: { message: 'Work order completed.' } }
  }, { detail: { tags: ['Maintenance'], summary: 'Complete work order' } })

  .post('/work-orders/:id/close', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      closeWorkOrderCommand({ workOrderId: params.id, orgId: user.orgId }, db)
    )
    return { data: { message: 'Work order closed.' } }
  }, { detail: { tags: ['Maintenance'], summary: 'Close work order' } })
