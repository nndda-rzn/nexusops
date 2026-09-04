import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { listTripsQuery, getTripQuery } from '@/modules/road/application/queries/road-resources.query'
import { getTripCheckpointsQuery } from '@/modules/road/application/queries/road-tracking.query'
import { createTripCommand } from '@/modules/road/application/commands/create-trip.command'
import { assignTripCommand, dispatchTripCommand, departTripCommand, arriveTripCommand, completeTripCommand } from '@/modules/road/application/commands/trip-lifecycle.command'
import { delayTripCommand, recordCheckpointCommand } from '@/modules/road/application/commands/trip-events.command'

export const tripsRoutes = new Elysia({ prefix: '/road' })
  .use(authMiddleware)

  .get('/trips', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listTripsQuery(user.orgId, db, {
        ...(query.page ? { page: Number(query.page) } : {}),
        ...(query.limit ? { limit: Number(query.limit) } : {}),
      })
    )
    return result
  }, {
    query: t.Object({ page: t.Optional(t.String()), limit: t.Optional(t.String()) }),
    detail: { tags: ['Road'], summary: 'List trips' },
  })

  .get('/trips/:id', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => getTripQuery(params.id, user.orgId, db))
    if (!result) return new Response(JSON.stringify({ error: 'Trip not found' }), { status: 404 })
    return { data: result }
  }, { detail: { tags: ['Road'], summary: 'Get trip by ID' } })

  .post('/trips', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      createTripCommand({
        orgId: user.orgId, origin: body.origin, destination: body.destination,
        ...(body.vehicle_id ? { vehicleId: body.vehicle_id } : {}),
        ...(body.driver_id ? { driverId: body.driver_id } : {}),
        ...(body.shipment_id ? { shipmentId: body.shipment_id } : {}),
        ...(body.container_id ? { containerId: body.container_id } : {}),
        ...(body.scheduled_departure ? { scheduledDeparture: new Date(body.scheduled_departure) } : {}),
        ...(body.scheduled_arrival ? { scheduledArrival: new Date(body.scheduled_arrival) } : {}),
        ...(body.notes ? { notes: body.notes } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      origin:               t.String(), destination: t.String(),
      vehicle_id:           t.Optional(t.String()), driver_id: t.Optional(t.String()),
      shipment_id:          t.Optional(t.String()), container_id: t.Optional(t.String()),
      scheduled_departure:  t.Optional(t.String()), scheduled_arrival: t.Optional(t.String()),
      notes:                t.Optional(t.String()),
    }),
    detail: { tags: ['Road'], summary: 'Create trip' },
  })

  .post('/trips/:id/assign', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      assignTripCommand({ tripId: params.id, orgId: user.orgId, vehicleId: body.vehicle_id, driverId: body.driver_id }, db)
    )
    return { data: { message: 'Trip assigned.' } }
  }, {
    body: t.Object({ vehicle_id: t.String(), driver_id: t.String() }),
    detail: { tags: ['Road'], summary: 'Assign vehicle and driver to trip' },
  })

  .post('/trips/:id/dispatch', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      dispatchTripCommand({ tripId: params.id, orgId: user.orgId, dispatcherId: user.id }, db)
    )
    return { data: { message: 'Trip dispatched.' } }
  }, { detail: { tags: ['Road'], summary: 'Dispatch trip' } })

  .post('/trips/:id/depart', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      departTripCommand({ tripId: params.id, orgId: user.orgId, ...(body.actual_departure ? { actualDeparture: new Date(body.actual_departure) } : {}) }, db)
    )
    return { data: { message: 'Trip departed.' } }
  }, {
    body: t.Object({ actual_departure: t.Optional(t.String()) }),
    detail: { tags: ['Road'], summary: 'Depart trip' },
  })

  .post('/trips/:id/checkpoint', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      recordCheckpointCommand({
        tripId: params.id, orgId: user.orgId, checkpointType: body.checkpoint_type,
        ...(body.location ? { location: body.location } : {}),
        ...(body.notes ? { notes: body.notes } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      checkpoint_type: t.Union([t.Literal('GATE_OUT'), t.Literal('WEIGH_BRIDGE'), t.Literal('TOLL'), t.Literal('DELIVERY_POINT')]),
      location:        t.Optional(t.String()), notes: t.Optional(t.String()),
    }),
    detail: { tags: ['Road'], summary: 'Record checkpoint' },
  })

  .post('/trips/:id/arrive', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      arriveTripCommand({ tripId: params.id, orgId: user.orgId, ...(body.actual_arrival ? { actualArrival: new Date(body.actual_arrival) } : {}) }, db)
    )
    return { data: { message: 'Trip arrived.' } }
  }, {
    body: t.Object({ actual_arrival: t.Optional(t.String()) }),
    detail: { tags: ['Road'], summary: 'Record trip arrival' },
  })

  .post('/trips/:id/complete', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      completeTripCommand({ tripId: params.id, orgId: user.orgId }, db)
    )
    return { data: { message: 'Trip completed.' } }
  }, { detail: { tags: ['Road'], summary: 'Complete trip' } })

  .post('/trips/:id/delay', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      delayTripCommand({ tripId: params.id, orgId: user.orgId, delayMinutes: body.delay_minutes }, db)
    )
    return { data: { message: 'Trip delayed.' } }
  }, {
    body: t.Object({ delay_minutes: t.Number({ minimum: 1 }) }),
    detail: { tags: ['Road'], summary: 'Delay trip' },
  })

  .get('/trips/:id/checkpoints', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => getTripCheckpointsQuery(params.id, user.orgId, db))
    return { data: result }
  }, { detail: { tags: ['Road'], summary: 'Get trip checkpoints' } })
