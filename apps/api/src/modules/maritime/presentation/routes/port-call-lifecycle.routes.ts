import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { confirmEtaCommand } from '@/modules/maritime/application/commands/confirm-eta.command'
import { requestPilotageCommand } from '@/modules/maritime/application/commands/request-pilotage.command'
import { assignPilotCommand } from '@/modules/maritime/application/commands/assign-pilot.command'
import { recordArrivalCommand } from '@/modules/maritime/application/commands/record-arrival.command'
import { startBerthingCommand } from '@/modules/maritime/application/commands/start-berthing.command'
import { recordBerthedCommand } from '@/modules/maritime/application/commands/record-berthed.command'
import { startOperationsCommand } from '@/modules/maritime/application/commands/start-operations.command'
import { completeOperationsCommand } from '@/modules/maritime/application/commands/complete-operations.command'
import { departVesselCommand } from '@/modules/maritime/application/commands/depart-vessel.command'

export const portCallLifecycleRoutes = new Elysia({ prefix: '/maritime' })
  .use(authMiddleware)

  .post('/port-calls/:id/confirm-eta', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      confirmEtaCommand({ portCallId: params.id, orgId: user.orgId, eta: new Date(body.eta), actorId: user.id }, db)
    )
    return { data: { message: 'ETA confirmed.' } }
  }, {
    body: t.Object({ eta: t.String() }),
    detail: { tags: ['Maritime'], summary: 'Confirm ETA' },
  })

  .post('/port-calls/:id/request-pilotage', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      requestPilotageCommand({ portCallId: params.id, orgId: user.orgId }, db)
    )
    return { data: { message: 'Pilotage requested.' } }
  }, { detail: { tags: ['Maritime'], summary: 'Request pilotage' } })

  .post('/port-calls/:id/assign-pilot', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      assignPilotCommand({
        portCallId: params.id, orgId: user.orgId, type: body.type,
        scheduledAt: new Date(body.scheduled_at),
        ...(body.pilot_id ? { pilotId: body.pilot_id } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      type:         t.Union([t.Literal('INBOUND'), t.Literal('OUTBOUND')]),
      scheduled_at: t.String(),
      pilot_id:     t.Optional(t.String()),
    }),
    detail: { tags: ['Maritime'], summary: 'Assign pilot' },
  })

  .post('/port-calls/:id/arrive', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      recordArrivalCommand({
        portCallId: params.id, orgId: user.orgId,
        ata: body.ata ? new Date(body.ata) : new Date(),
      }, db)
    )
    return { data: { message: 'Vessel arrived at anchorage.' } }
  }, {
    body: t.Object({ ata: t.Optional(t.String()) }),
    detail: { tags: ['Maritime'], summary: 'Record vessel arrival' },
  })

  .post('/port-calls/:id/berth', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      startBerthingCommand({ portCallId: params.id, orgId: user.orgId }, db)
    )
    return { data: { message: 'Berthing started.' } }
  }, { detail: { tags: ['Maritime'], summary: 'Start berthing' } })

  .post('/port-calls/:id/berthed', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      recordBerthedCommand({
        portCallId: params.id, orgId: user.orgId,
        atb: body.atb ? new Date(body.atb) : new Date(),
        ...(body.berth_id ? { berthId: body.berth_id } : {}),
      }, db)
    )
    return { data: { message: 'Vessel berthed.' } }
  }, {
    body: t.Object({ atb: t.Optional(t.String()), berth_id: t.Optional(t.String()) }),
    detail: { tags: ['Maritime'], summary: 'Record vessel berthed' },
  })

  .post('/port-calls/:id/start-operations', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      startOperationsCommand({ portCallId: params.id, orgId: user.orgId }, db)
    )
    return { data: { message: 'Operations started.' } }
  }, { detail: { tags: ['Maritime'], summary: 'Start port operations' } })

  .post('/port-calls/:id/complete-operations', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      completeOperationsCommand({ portCallId: params.id, orgId: user.orgId }, db)
    )
    return { data: { message: 'Operations completed.' } }
  }, { detail: { tags: ['Maritime'], summary: 'Complete port operations' } })

  .post('/port-calls/:id/depart', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      departVesselCommand({
        portCallId: params.id, orgId: user.orgId,
        atd: body.atd ? new Date(body.atd) : new Date(),
      }, db)
    )
    return { data: { message: 'Vessel departed.' } }
  }, {
    body: t.Object({ atd: t.Optional(t.String()) }),
    detail: { tags: ['Maritime'], summary: 'Record vessel departure' },
  })
