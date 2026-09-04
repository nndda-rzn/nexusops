import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { listVesselsQuery } from '@/modules/maritime/application/queries/list-vessels.query'
import { getVesselQuery } from '@/modules/maritime/application/queries/get-vessel.query'
import { getVesselPositionsQuery } from '@/modules/maritime/application/queries/get-vessel-positions.query'
import { registerVesselCommand } from '@/modules/maritime/application/commands/register-vessel.command'
import { updateVesselStatusCommand } from '@/modules/maritime/application/commands/update-vessel-status.command'
import { updateVesselPositionCommand } from '@/modules/maritime/application/commands/update-vessel-position.command'
import type { VesselType, VesselStatus } from '@/modules/maritime/domain/entities/vessel.entity'

export const vesselsRoutes = new Elysia({ prefix: '/maritime' })
  .use(authMiddleware)

  // GET /maritime/vessels
  .get('/vessels', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listVesselsQuery(user.orgId, db, {
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
        t.Literal('ACTIVE'), t.Literal('IN_VOYAGE'),
        t.Literal('MAINTENANCE'), t.Literal('LAID_UP'),
      ])),
    }),
    detail: { tags: ['Maritime'], summary: 'List vessels' },
  })

  // GET /maritime/vessels/:id
  .get('/vessels/:id', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => getVesselQuery(params.id, user.orgId, db))
    return { data: result }
  }, { detail: { tags: ['Maritime'], summary: 'Get vessel by ID' } })

  // POST /maritime/vessels
  .post('/vessels', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      registerVesselCommand({
        orgId: user.orgId,
        imoNumber: body.imo_number,
        name: body.name,
        type: body.type as VesselType,
        ...(body.mmsi ? { mmsi: body.mmsi } : {}),
        ...(body.flag ? { flag: body.flag } : {}),
        ...(body.gross_tonnage ? { grossTonnage: body.gross_tonnage } : {}),
        ...(body.loa ? { loa: body.loa } : {}),
        ...(body.beam ? { beam: body.beam } : {}),
        ...(body.max_draft ? { maxDraft: body.max_draft } : {}),
        ...(body.teu_capacity !== undefined ? { teuCapacity: body.teu_capacity } : {}),
        ...(body.owner ? { owner: body.owner } : {}),
        ...(body.operator ? { operator: body.operator } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      imo_number:    t.String(),
      name:          t.String(),
      type:          t.Union([
        t.Literal('CONTAINER'), t.Literal('BULK'), t.Literal('TANKER'),
        t.Literal('RORO'), t.Literal('GENERAL_CARGO'), t.Literal('LNG'), t.Literal('LPG'),
      ]),
      mmsi:          t.Optional(t.String()),
      flag:          t.Optional(t.String()),
      gross_tonnage: t.Optional(t.String()),
      loa:           t.Optional(t.String()),
      beam:          t.Optional(t.String()),
      max_draft:     t.Optional(t.String()),
      teu_capacity:  t.Optional(t.Number()),
      owner:         t.Optional(t.String()),
      operator:      t.Optional(t.String()),
    }),
    detail: { tags: ['Maritime'], summary: 'Register vessel' },
  })

  // PATCH /maritime/vessels/:id/status
  .patch('/vessels/:id/status', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      updateVesselStatusCommand({
        vesselId: params.id, orgId: user.orgId,
        status: body.status as VesselStatus, actorId: user.id,
      }, db)
    )
    return { data: { message: 'Vessel status updated.' } }
  }, {
    body: t.Object({
      status: t.Union([
        t.Literal('ACTIVE'), t.Literal('IN_VOYAGE'),
        t.Literal('MAINTENANCE'), t.Literal('LAID_UP'),
      ]),
    }),
    detail: { tags: ['Maritime'], summary: 'Update vessel status' },
  })

  // GET /maritime/vessels/:id/positions
  .get('/vessels/:id/positions', async ({ user, params, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      getVesselPositionsQuery(params.id, db, query.limit ? Number(query.limit) : 100)
    )
    return { data: result }
  }, {
    query: t.Object({ limit: t.Optional(t.String()) }),
    detail: { tags: ['Maritime'], summary: 'Get vessel AIS positions' },
  })

  // POST /maritime/vessel-positions
  .post('/vessel-positions', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      updateVesselPositionCommand({
        vesselId: body.vessel_id,
        orgId: user.orgId,
        position: body.position,
        ...(body.speed ? { speed: body.speed } : {}),
        ...(body.heading ? { heading: body.heading } : {}),
        ...(body.recorded_at ? { recordedAt: new Date(body.recorded_at) } : {}),
      }, db)
    )
    return { data: { message: 'Position recorded.' } }
  }, {
    body: t.Object({
      vessel_id:   t.String(),
      position:    t.String(),
      speed:       t.Optional(t.String()),
      heading:     t.Optional(t.String()),
      recorded_at: t.Optional(t.String()),
    }),
    detail: { tags: ['Maritime'], summary: 'Ingest AIS vessel position' },
  })
