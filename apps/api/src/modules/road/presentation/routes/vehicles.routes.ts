import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { listVehiclesQuery, getVehicleQuery, listDriversQuery } from '@/modules/road/application/queries/road-resources.query'
import { registerVehicleCommand, registerDriverCommand } from '@/modules/road/application/commands/register-vehicle-driver.command'
import { reportVehicleBreakdownCommand } from '@/modules/road/application/commands/trip-events.command'
import { getVehiclePositionsQuery } from '@/modules/road/application/queries/road-tracking.query'
import { updateVehiclePositionCommand } from '@/modules/road/application/commands/update-vehicle-position.command'

export const vehiclesRoutes = new Elysia({ prefix: '/road' })
  .use(authMiddleware)

  .get('/vehicles', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listVehiclesQuery(user.orgId, db, {
        ...(query.page ? { page: Number(query.page) } : {}),
        ...(query.limit ? { limit: Number(query.limit) } : {}),
        ...(query.status ? { status: query.status } : {}),
      })
    )
    return result
  }, {
    query: t.Object({
      page:   t.Optional(t.String()),
      limit:  t.Optional(t.String()),
      status: t.Optional(t.Union([
        t.Literal('AVAILABLE'), t.Literal('ON_TRIP'),
        t.Literal('MAINTENANCE'), t.Literal('OFFLINE'),
      ])),
    }),
    detail: { tags: ['Road'], summary: 'List vehicles' },
  })

  .get('/vehicles/:id', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => getVehicleQuery(params.id, user.orgId, db))
    return { data: result }
  }, { detail: { tags: ['Road'], summary: 'Get vehicle by ID' } })

  .post('/vehicles', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      registerVehicleCommand({
        orgId: user.orgId, plateNumber: body.plate_number, type: body.type,
        ...(body.brand ? { brand: body.brand } : {}),
        ...(body.model ? { model: body.model } : {}),
        ...(body.year !== undefined ? { year: body.year } : {}),
        ...(body.capacity_weight ? { capacityWeight: body.capacity_weight } : {}),
        ...(body.capacity_volume ? { capacityVolume: body.capacity_volume } : {}),
        ...(body.container_capable !== undefined ? { containerCapable: body.container_capable } : {}),
        ...(body.has_reefer !== undefined ? { hasReefer: body.has_reefer } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      plate_number:      t.String(),
      type:              t.Union([t.Literal('TRUCK'), t.Literal('TRAILER'), t.Literal('PICKUP'), t.Literal('VAN')]),
      brand:             t.Optional(t.String()),
      model:             t.Optional(t.String()),
      year:              t.Optional(t.Number()),
      capacity_weight:   t.Optional(t.String()),
      capacity_volume:   t.Optional(t.String()),
      container_capable: t.Optional(t.Boolean()),
      has_reefer:        t.Optional(t.Boolean()),
    }),
    detail: { tags: ['Road'], summary: 'Register vehicle' },
  })

  .post('/vehicles/:id/breakdown', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      reportVehicleBreakdownCommand({
        vehicleId: params.id, orgId: user.orgId,
        ...(body.trip_id ? { tripId: body.trip_id } : {}),
      }, db)
    )
    return { data: { message: 'Breakdown reported.' } }
  }, {
    body: t.Object({ trip_id: t.Optional(t.String()) }),
    detail: { tags: ['Road'], summary: 'Report vehicle breakdown' },
  })

  .get('/vehicles/:id/positions', async ({ user, params, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      getVehiclePositionsQuery(params.id, db, query.limit ? Number(query.limit) : 100)
    )
    return { data: result }
  }, {
    query: t.Object({ limit: t.Optional(t.String()) }),
    detail: { tags: ['Road'], summary: 'Get vehicle GPS positions' },
  })

  .post('/vehicle-positions', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      updateVehiclePositionCommand({
        vehicleId: body.vehicle_id, position: body.position,
        ...(body.speed ? { speed: body.speed } : {}),
        ...(body.heading ? { heading: body.heading } : {}),
        ...(body.recorded_at ? { recordedAt: new Date(body.recorded_at) } : {}),
      }, db)
    )
    return { data: { message: 'Position recorded.' } }
  }, {
    body: t.Object({
      vehicle_id:  t.String(), position: t.String(),
      speed:       t.Optional(t.String()), heading: t.Optional(t.String()),
      recorded_at: t.Optional(t.String()),
    }),
    detail: { tags: ['Road'], summary: 'Ingest GPS vehicle position' },
  })

  .get('/drivers', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listDriversQuery(user.orgId, db, {
        ...(query.page ? { page: Number(query.page) } : {}),
        ...(query.limit ? { limit: Number(query.limit) } : {}),
      })
    )
    return result
  }, {
    query: t.Object({ page: t.Optional(t.String()), limit: t.Optional(t.String()) }),
    detail: { tags: ['Road'], summary: 'List drivers' },
  })

  .post('/drivers', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      registerDriverCommand({
        orgId: user.orgId, licenseNumber: body.license_number,
        licenseType: body.license_type, licenseExpiry: new Date(body.license_expiry),
        ...(body.employee_id ? { employeeId: body.employee_id } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      license_number: t.String(), license_type: t.String(),
      license_expiry: t.String(), employee_id: t.Optional(t.String()),
    }),
    detail: { tags: ['Road'], summary: 'Register driver' },
  })
