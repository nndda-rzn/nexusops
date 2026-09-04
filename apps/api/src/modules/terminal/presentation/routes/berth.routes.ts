import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { assignBerthCommand } from '@/modules/terminal/application/commands/assign-berth.command'
import { listBerthsQuery, getBerthAssignmentsQuery } from '@/modules/terminal/application/queries/berth.queries'

export const berthRoutes = new Elysia({ prefix: '/terminal' })
  .use(authMiddleware)

  // GET /terminal/berths
  .get('/berths', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listBerthsQuery(user.orgId, query.terminal_id, db, {
        ...(query.page ? { page: Number(query.page) } : {}),
        ...(query.limit ? { limit: Number(query.limit) } : {}),
      })
    )
    return result
  }, {
    query: t.Object({
      terminal_id: t.Optional(t.String()),
      page:        t.Optional(t.String()),
      limit:       t.Optional(t.String()),
    }),
    detail: { tags: ['Terminal'], summary: 'List berths' },
  })

  // GET /terminal/berths/:id/assignments
  .get('/berths/:id/assignments', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      getBerthAssignmentsQuery(user.orgId, params.id, db)
    )
    return { data: result }
  }, {
    detail: { tags: ['Terminal'], summary: 'Get berth assignments' },
  })

  // POST /terminal/berths/:id/assign
  .post('/berths/:id/assign', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      assignBerthCommand({
        orgId: user.orgId,
        portCallId: body.port_call_id,
        berthId: params.id,
        plannedStart: new Date(body.planned_start),
        plannedEnd: new Date(body.planned_end),
        assignedBy: user.id,
        ...(body.notes ? { notes: body.notes } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      port_call_id:  t.String(),
      planned_start: t.String(),
      planned_end:   t.String(),
      notes:         t.Optional(t.String()),
    }),
    detail: { tags: ['Terminal'], summary: 'Assign berth to port call' },
  })
