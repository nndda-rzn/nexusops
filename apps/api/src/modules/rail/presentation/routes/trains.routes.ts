import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { listTrainsQuery, getTrainQuery } from '@/modules/rail/application/queries/list-trains.query'
import { scheduleTrainCommand } from '@/modules/rail/application/commands/schedule-train.command'
import { assignTrainsetCommand } from '@/modules/rail/application/commands/assign-trainset.command'
import { assignCrewCommand } from '@/modules/rail/application/commands/assign-crew.command'
import { getPlatformAssignmentsQuery } from '@/modules/rail/application/queries/rail-resources.query'

export const trainsRoutes = new Elysia({ prefix: '/rail' })
  .use(authMiddleware)

  .get('/trains', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listTrainsQuery(user.orgId, db, {
        ...(query.page ? { page: Number(query.page) } : {}),
        ...(query.limit ? { limit: Number(query.limit) } : {}),
        ...(query.service_id ? { serviceId: query.service_id } : {}),
      })
    )
    return result
  }, {
    query: t.Object({
      page:       t.Optional(t.String()),
      limit:      t.Optional(t.String()),
      service_id: t.Optional(t.String()),
    }),
    detail: { tags: ['Rail'], summary: 'List trains' },
  })

  .get('/trains/:id', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => getTrainQuery(params.id, user.orgId, db))
    if (!result) return new Response(JSON.stringify({ error: 'Train not found' }), { status: 404 })
    return { data: result }
  }, { detail: { tags: ['Rail'], summary: 'Get train by ID' } })

  .post('/trains', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      scheduleTrainCommand({
        orgId: user.orgId, serviceId: body.service_id,
        trainNumber: body.train_number,
        scheduledDeparture: new Date(body.scheduled_departure),
        scheduledArrival: new Date(body.scheduled_arrival),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      service_id:          t.String(),
      train_number:        t.String(),
      scheduled_departure: t.String(),
      scheduled_arrival:   t.String(),
    }),
    detail: { tags: ['Rail'], summary: 'Schedule train' },
  })

  .post('/trains/:id/assign-trainset', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      assignTrainsetCommand({ trainId: params.id, orgId: user.orgId, trainsetId: body.trainset_id }, db)
    )
    return { data: { message: 'Trainset assigned.' } }
  }, {
    body: t.Object({ trainset_id: t.String() }),
    detail: { tags: ['Rail'], summary: 'Assign trainset to train' },
  })

  .post('/trains/:id/assign-crew', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      assignCrewCommand({
        trainId: params.id, orgId: user.orgId, role: body.role,
        fromStationId: body.from_station_id, toStationId: body.to_station_id,
        ...(body.employee_id ? { employeeId: body.employee_id } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      role:             t.Union([t.Literal('DRIVER'), t.Literal('ASSISTANT'), t.Literal('CONDUCTOR')]),
      from_station_id:  t.String(),
      to_station_id:    t.String(),
      employee_id:      t.Optional(t.String()),
    }),
    detail: { tags: ['Rail'], summary: 'Assign crew to train' },
  })

  .get('/trains/:id/platform-assignments', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      getPlatformAssignmentsQuery(params.id, user.orgId, db)
    )
    return { data: result }
  }, { detail: { tags: ['Rail'], summary: 'Get train platform assignments' } })
