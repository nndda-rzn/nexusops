import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { assignCraneCommand } from '@/modules/terminal/application/commands/assign-crane.command'
import { reportCraneBreakdownCommand } from '@/modules/terminal/application/commands/report-crane-breakdown.command'
import { createCraneCommand } from '@/modules/terminal/application/commands/terminal.commands'
import { listCranesQuery } from '@/modules/terminal/application/queries/crane.queries'

export const craneRoutes = new Elysia({ prefix: '/terminal' })
  .use(authMiddleware)

  // GET /terminal/cranes
  .get('/cranes', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listCranesQuery(user.orgId, db, {
        ...(query.page ? { page: Number(query.page) } : {}),
        ...(query.limit ? { limit: Number(query.limit) } : {}),
      })
    )
    return result
  }, {
    query: t.Object({
      page:  t.Optional(t.String()),
      limit: t.Optional(t.String()),
    }),
    detail: { tags: ['Terminal'], summary: 'List cranes' },
  })

  // POST /terminal/cranes
  .post('/cranes', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      createCraneCommand({
        orgId: user.orgId,
        terminalId: body.terminal_id,
        code: body.code,
        type: body.type,
        ...(body.capacity_tonnes ? { capacityTonnes: body.capacity_tonnes } : {}),
        ...(body.max_outreach_m ? { maxOutreachM: body.max_outreach_m } : {}),
        ...(body.asset_id ? { assetId: body.asset_id } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      terminal_id:      t.String(),
      code:             t.String(),
      type:             t.Union([
        t.Literal('STS'),
        t.Literal('RTG'),
        t.Literal('RMG'),
        t.Literal('MOBILE'),
        t.Literal('FORKLIFT'),
      ]),
      capacity_tonnes:  t.Optional(t.String()),
      max_outreach_m:   t.Optional(t.String()),
      asset_id:         t.Optional(t.String()),
    }),
    detail: { tags: ['Terminal'], summary: 'Create crane' },
  })

  // POST /terminal/cranes/:id/assign
  .post('/cranes/:id/assign', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      assignCraneCommand({
        orgId: user.orgId,
        craneId: params.id,
        berthId: body.berth_id,
        portCallId: body.port_call_id,
        plannedStart: new Date(body.planned_start),
        plannedEnd: new Date(body.planned_end),
        assignedMoves: body.assigned_moves,
        ...(body.notes ? { notes: body.notes } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      berth_id:       t.String(),
      port_call_id:   t.String(),
      planned_start:  t.String(),
      planned_end:    t.String(),
      assigned_moves: t.Optional(t.Number()),
      notes:          t.Optional(t.String()),
    }),
    detail: { tags: ['Terminal'], summary: 'Assign crane to berth' },
  })

  // POST /terminal/cranes/:id/breakdown
  .post('/cranes/:id/breakdown', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      reportCraneBreakdownCommand({
        orgId: user.orgId,
        craneId: params.id,
        reportedBy: user.id,
        reason: body.reason,
      }, db)
    )
    return { data: { message: 'Crane breakdown reported.' } }
  }, {
    body: t.Object({ reason: t.String({ minLength: 1 }) }),
    detail: { tags: ['Terminal'], summary: 'Report crane breakdown' },
  })
