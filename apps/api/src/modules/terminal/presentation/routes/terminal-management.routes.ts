import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import {
  createTerminalCommand, listTerminalsQuery,
  createGateCommand, listGatesQuery, updateGateStatusCommand,
} from '@/modules/terminal/application/commands/terminal.commands'
import { restoreCraneCommand } from '@/modules/terminal/application/commands/restore-crane.command'

export const terminalManagementRoutes = new Elysia({ prefix: '/terminal' })
  .use(authMiddleware)

  // GET /terminal/terminals
  .get('/terminals', async ({ user }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => listTerminalsQuery(user.orgId, db))
    return { data: result }
  }, {
    detail: { tags: ['Terminal'], summary: 'List terminals' },
  })

  // POST /terminal/terminals
  .post('/terminals', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      createTerminalCommand({
        orgId: user.orgId,
        code: body.code, name: body.name,
        type: body.type as 'CONTAINER' | 'BULK' | 'LIQUID' | 'RORO' | 'MULTIPURPOSE',
        ...(body.max_vessel_loa ? { maxVesselLoa: body.max_vessel_loa } : {}),
        ...(body.max_vessel_draft ? { maxVesselDraft: body.max_vessel_draft } : {}),
        ...(body.annual_capacity_teu ? { annualCapacityTeu: body.annual_capacity_teu } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      code:                 t.String(),
      name:                 t.String(),
      type:                 t.String(),
      max_vessel_loa:       t.Optional(t.String()),
      max_vessel_draft:     t.Optional(t.String()),
      annual_capacity_teu:  t.Optional(t.Number()),
    }),
    detail: { tags: ['Terminal'], summary: 'Create terminal' },
  })

  // GET /terminal/terminals/:id/gates
  .get('/terminals/:id/gates', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listGatesQuery(user.orgId, params.id, db)
    )
    return { data: result }
  }, {
    detail: { tags: ['Terminal'], summary: 'List gates for terminal' },
  })

  // POST /terminal/terminals/:id/gates
  .post('/terminals/:id/gates', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      createGateCommand({
        orgId: user.orgId,
        terminalId: params.id,
        gateNumber: body.gate_number,
        type: body.type as 'IN' | 'OUT' | 'INOUT',
        ...(body.lane_count ? { laneCount: body.lane_count } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      gate_number: t.String(),
      type:        t.Union([t.Literal('IN'), t.Literal('OUT'), t.Literal('INOUT')]),
      lane_count:  t.Optional(t.Number()),
    }),
    detail: { tags: ['Terminal'], summary: 'Create gate' },
  })

  // PATCH /terminal/gates/:id/status
  .patch('/gates/:id/status', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      updateGateStatusCommand({
        orgId: user.orgId,
        gateId: params.id,
        status: body.status as 'OPEN' | 'CLOSED' | 'RESTRICTED',
      }, db)
    )
    return { data: { message: 'Gate status updated.' } }
  }, {
    body: t.Object({
      status: t.Union([t.Literal('OPEN'), t.Literal('CLOSED'), t.Literal('RESTRICTED')]),
    }),
    detail: { tags: ['Terminal'], summary: 'Update gate status' },
  })

  // POST /terminal/cranes/:id/restore
  .post('/cranes/:id/restore', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      restoreCraneCommand({
        orgId: user.orgId,
        craneId: params.id,
        restoredBy: user.id,
      }, db)
    )
    return { data: { message: 'Crane restored to AVAILABLE.' } }
  }, {
    detail: { tags: ['Terminal'], summary: 'Restore crane after breakdown/maintenance' },
  })
