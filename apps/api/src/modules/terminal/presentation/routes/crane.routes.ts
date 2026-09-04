import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { assignCraneCommand } from '@/modules/terminal/application/commands/assign-crane.command'
import { reportCraneBreakdownCommand } from '@/modules/terminal/application/commands/report-crane-breakdown.command'
import { cranes } from '@/shared/database/schema/terminal'
import { eq } from 'drizzle-orm'

export const craneRoutes = new Elysia({ prefix: '/terminal' })
  .use(authMiddleware)

  // GET /terminal/cranes
  .get('/cranes', async ({ user }) => {
    if (!user) throw new UnauthorizedError()
    return withDbContext(user, async (db) => {
      const result = await db.select({
        id: cranes.id, code: cranes.code, type: cranes.type,
        status: cranes.status, terminalId: cranes.terminalId,
        currentBerthId: cranes.currentBerthId,
      }).from(cranes).where(eq(cranes.orgId, user.orgId))
      return { data: result }
    })
  }, {
    detail: { tags: ['Terminal'], summary: 'List cranes' },
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
      berth_id:      t.String(),
      port_call_id:  t.String(),
      planned_start: t.String(),
      planned_end:   t.String(),
      assigned_moves: t.Optional(t.Number()),
      notes:         t.Optional(t.String()),
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
