import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { getManifestByFlightQuery, listManifestItemsQuery, listLoadPlanItemsQuery, listSlotsQuery, listLoadPlansQuery } from '@/modules/aviation/application/queries/aviation-docs.queries'
import { createAirportSlotCommand, createManifestCommand, addAwbToManifestCommand, createLoadPlanCommand, addAwbToLoadPlanCommand } from '@/modules/aviation/application/commands/aviation-manifest.commands'

export const aviationDocsRoutes = new Elysia({ prefix: '/aviation' })
  .use(authMiddleware)

  .get('/slots', async ({ user }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => listSlotsQuery(user.orgId, db))
    return { data: result }
  }, { detail: { tags: ['Aviation'], summary: 'List airport slots' } })

  .post('/slots', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      createAirportSlotCommand({
        orgId: user.orgId, airportId: body.airport_id,
        slotType: body.slot_type, scheduledTime: new Date(body.scheduled_time),
        ...(body.flight_id ? { flightId: body.flight_id } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      airport_id:     t.String(),
      slot_type:      t.Union([t.Literal('DEPARTURE'), t.Literal('ARRIVAL')]),
      scheduled_time: t.String(),
      flight_id:      t.Optional(t.String()),
    }),
    detail: { tags: ['Aviation'], summary: 'Create airport slot' },
  })

  .get('/flights/:id/manifest', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => getManifestByFlightQuery(user.orgId, params.id, db))
    return { data: result }
  }, { detail: { tags: ['Aviation'], summary: 'Get cargo manifest for flight' } })

  .post('/flights/:id/manifest', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      createManifestCommand({ orgId: user.orgId, flightId: params.id }, db)
    )
    return { data: result }
  }, { detail: { tags: ['Aviation'], summary: 'Create cargo manifest for flight' } })

  .get('/manifests/:id/items', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => listManifestItemsQuery(params.id, db))
    return { data: result }
  }, { detail: { tags: ['Aviation'], summary: 'List manifest items' } })

  .post('/manifests/:id/items', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      addAwbToManifestCommand({
        orgId: user.orgId, manifestId: params.id,
        awbId: body.awb_id, pieces: body.pieces, weightKg: body.weight_kg,
        ...(body.position_code ? { positionCode: body.position_code } : {}),
      }, db)
    )
    return { data: { message: 'AWB added to manifest.' } }
  }, {
    body: t.Object({
      awb_id:        t.String(),
      pieces:        t.Number({ minimum: 1 }),
      weight_kg:     t.String(),
      position_code: t.Optional(t.String()),
    }),
    detail: { tags: ['Aviation'], summary: 'Add AWB to manifest' },
  })

  .get('/flights/:id/load-plans', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => listLoadPlansQuery(user.orgId, params.id, db))
    return { data: result }
  }, { detail: { tags: ['Aviation'], summary: 'List load plans for flight' } })

  .post('/flights/:id/load-plan', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      createLoadPlanCommand({
        orgId: user.orgId, flightId: params.id, aircraftId: body.aircraft_id,
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({ aircraft_id: t.String() }),
    detail: { tags: ['Aviation'], summary: 'Create load plan for flight' },
  })

  .get('/load-plans/:id/items', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => listLoadPlanItemsQuery(params.id, db))
    return { data: result }
  }, { detail: { tags: ['Aviation'], summary: 'List load plan items' } })

  .post('/load-plans/:id/items', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      addAwbToLoadPlanCommand({
        orgId: user.orgId, loadPlanId: params.id,
        awbId: body.awb_id, compartment: body.compartment,
        weightKg: body.weight_kg,
        ...(body.position ? { position: body.position } : {}),
        ...(body.uld_number ? { uldNumber: body.uld_number } : {}),
      }, db)
    )
    return { data: { message: 'AWB added to load plan.' } }
  }, {
    body: t.Object({
      awb_id:      t.String(),
      compartment: t.Union([t.Literal('FORWARD'), t.Literal('AFT'), t.Literal('BULK')]),
      weight_kg:   t.String(),
      position:    t.Optional(t.String()),
      uld_number:  t.Optional(t.String()),
    }),
    detail: { tags: ['Aviation'], summary: 'Add AWB to load plan' },
  })
