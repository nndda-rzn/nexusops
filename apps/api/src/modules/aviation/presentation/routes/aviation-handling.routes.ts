import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { listGroundHandlingsQuery } from '@/modules/aviation/application/queries/aviation-docs.queries'
import { createGroundHandlingCommand, startGroundHandlingCommand, completeGroundHandlingCommand, offloadFlightCommand, completeFlightCommand } from '@/modules/aviation/application/commands/aviation-docs.commands'

export const aviationHandlingRoutes = new Elysia({ prefix: '/aviation' })
  .use(authMiddleware)

  .get('/flights/:id/ground-handlings', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => listGroundHandlingsQuery(user.orgId, params.id, db))
    return { data: result }
  }, { detail: { tags: ['Aviation'], summary: 'List ground handlings for flight' } })

  .post('/flights/:id/ground-handling', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      createGroundHandlingCommand({
        orgId: user.orgId, flightId: params.id,
        airportId: body.airport_id, handlingType: body.handling_type,
        ...(body.handler_org_id ? { handlerOrgId: body.handler_org_id } : {}),
        ...(body.scheduled_start ? { scheduledStart: new Date(body.scheduled_start) } : {}),
        ...(body.scheduled_end ? { scheduledEnd: new Date(body.scheduled_end) } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      airport_id:      t.String(),
      handling_type:   t.Union([t.Literal('INBOUND'), t.Literal('OUTBOUND'), t.Literal('TRANSIT')]),
      handler_org_id:  t.Optional(t.String()),
      scheduled_start: t.Optional(t.String()),
      scheduled_end:   t.Optional(t.String()),
    }),
    detail: { tags: ['Aviation'], summary: 'Create ground handling' },
  })

  .post('/ground-handlings/:id/start', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      startGroundHandlingCommand({ orgId: user.orgId, handlingId: params.id }, db)
    )
    return { data: { message: 'Ground handling started.' } }
  }, { detail: { tags: ['Aviation'], summary: 'Start ground handling' } })

  .post('/ground-handlings/:id/complete', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      completeGroundHandlingCommand({ orgId: user.orgId, handlingId: params.id }, db)
    )
    return { data: { message: 'Ground handling completed.' } }
  }, { detail: { tags: ['Aviation'], summary: 'Complete ground handling' } })

  .post('/flights/:id/offload', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) => offloadFlightCommand({ flightId: params.id, orgId: user.orgId }, db))
    return { data: { message: 'Flight offloading.' } }
  }, { detail: { tags: ['Aviation'], summary: 'Start offloading' } })

  .post('/flights/:id/complete', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) => completeFlightCommand({ flightId: params.id, orgId: user.orgId }, db))
    return { data: { message: 'Flight completed.' } }
  }, { detail: { tags: ['Aviation'], summary: 'Complete flight' } })
