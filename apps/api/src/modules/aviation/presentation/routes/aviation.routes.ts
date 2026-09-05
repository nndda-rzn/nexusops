import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { parsePaginationQuery } from '@/shared/pagination/query-helpers'
import { listAircraftQuery, getAircraftQuery, listFlightsQuery, getFlightQuery, listAwbsQuery } from '@/modules/aviation/application/queries/aviation.queries'
import { registerAircraftCommand, scheduleFlightCommand, issueAwbCommand } from '@/modules/aviation/application/commands/aviation.commands'

export const aviationRoutes = new Elysia({ prefix: '/aviation' })
  .use(authMiddleware)

  .get('/aircraft', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listAircraftQuery(user.orgId, db, {
        ...parsePaginationQuery(query),
        ...(query.status ? { status: query.status } : {}),
      })
    )
    return result
  }, {
    query: t.Object({
      page:   t.Optional(t.String()),
      limit:  t.Optional(t.String()),
      status: t.Optional(t.Union([t.Literal('ACTIVE'), t.Literal('MAINTENANCE'), t.Literal('AOG'), t.Literal('RETIRED')])),
    }),
    detail: { tags: ['Aviation'], summary: 'List aircraft' },
  })

  .get('/aircraft/:id', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => getAircraftQuery(params.id, user.orgId, db))
    return { data: result }
  }, { detail: { tags: ['Aviation'], summary: 'Get aircraft by ID' } })

  .post('/aircraft', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      registerAircraftCommand({
        orgId: user.orgId, registrationNumber: body.registration_number,
        aircraftType: body.aircraft_type,
        ...(body.max_payload_kg ? { maxPayloadKg: body.max_payload_kg } : {}),
        ...(body.max_volume_m3 ? { maxVolumeM3: body.max_volume_m3 } : {}),
        ...(body.operator_org_id ? { operatorOrgId: body.operator_org_id } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      registration_number: t.String(),
      aircraft_type:       t.String(),
      max_payload_kg:      t.Optional(t.String()),
      max_volume_m3:       t.Optional(t.String()),
      operator_org_id:     t.Optional(t.String()),
    }),
    detail: { tags: ['Aviation'], summary: 'Register aircraft' },
  })

  .get('/flights', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listFlightsQuery(user.orgId, db, {
        ...parsePaginationQuery(query),
        ...(query.status ? { status: query.status } : {}),
      })
    )
    return result
  }, {
    query: t.Object({ page: t.Optional(t.String()), limit: t.Optional(t.String()), status: t.Optional(t.String()) }),
    detail: { tags: ['Aviation'], summary: 'List flights' },
  })

  .get('/flights/:id', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => getFlightQuery(params.id, user.orgId, db))
    return { data: result }
  }, { detail: { tags: ['Aviation'], summary: 'Get flight by ID' } })

  .post('/flights', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      scheduleFlightCommand({
        orgId: user.orgId, flightNumber: body.flight_number,
        aircraftId: body.aircraft_id,
        scheduledDeparture: new Date(body.scheduled_departure),
        scheduledArrival: new Date(body.scheduled_arrival),
        ...(body.origin_airport_id ? { originAirportId: body.origin_airport_id } : {}),
        ...(body.destination_airport_id ? { destinationAirportId: body.destination_airport_id } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      flight_number:          t.String(),
      aircraft_id:            t.String(),
      scheduled_departure:    t.String(),
      scheduled_arrival:      t.String(),
      origin_airport_id:      t.Optional(t.String()),
      destination_airport_id: t.Optional(t.String()),
    }),
    detail: { tags: ['Aviation'], summary: 'Schedule flight' },
  })

  .get('/awbs', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listAwbsQuery(user.orgId, db, {
        ...parsePaginationQuery(query),
        ...(query.flight_id ? { flightId: query.flight_id } : {}),
      })
    )
    return result
  }, {
    query: t.Object({ page: t.Optional(t.String()), limit: t.Optional(t.String()), flight_id: t.Optional(t.String()) }),
    detail: { tags: ['Aviation'], summary: 'List airway bills' },
  })

  .post('/awbs', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      issueAwbCommand({
        orgId: user.orgId, awbNumber: body.awb_number,
        flightId: body.flight_id,
        grossWeightKg: body.gross_weight_kg, pieces: body.pieces,
        ...(body.origin_airport_id ? { originAirportId: body.origin_airport_id } : {}),
        ...(body.destination_airport_id ? { destinationAirportId: body.destination_airport_id } : {}),
        ...(body.is_dangerous_goods !== undefined ? { isDangerousGoods: body.is_dangerous_goods } : {}),
        ...(body.dg_class ? { dgClass: body.dg_class } : {}),
        ...(body.chargeable_weight_kg ? { chargeableWeightKg: body.chargeable_weight_kg } : {}),
        ...(body.volume_m3 ? { volumeM3: body.volume_m3 } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      awb_number:             t.String(),
      flight_id:              t.String(),
      gross_weight_kg:        t.String(),
      pieces:                 t.Number({ minimum: 1 }),
      origin_airport_id:      t.Optional(t.String()),
      destination_airport_id: t.Optional(t.String()),
      is_dangerous_goods:     t.Optional(t.Boolean()),
      dg_class:               t.Optional(t.String()),
      chargeable_weight_kg:   t.Optional(t.String()),
      volume_m3:              t.Optional(t.String()),
    }),
    detail: { tags: ['Aviation'], summary: 'Issue airway bill' },
  })
