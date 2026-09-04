import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext, requireHolding } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { listStationsQuery, getStationQuery } from '@/modules/shared-master/application/queries/list-stations.query'
import { createStationCommand } from '@/modules/shared-master/application/commands/create-station.command'
import { parsePaginationQuery } from '@/shared/pagination/query-helpers'

export const stationsRoutes = new Elysia({ prefix: '/shared-master' })
  .use(authMiddleware)

  // GET /shared-master/stations
  .get('/stations', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listStationsQuery(db, {
        ...parsePaginationQuery(query),
        ...(query.type ? { type: query.type as 'PORT' | 'DRY_PORT' | 'INLAND' | 'JUNCTION' | 'YARD' } : {}),
      })
    )
    return result
  }, {
    query: t.Object({
      page:  t.Optional(t.String()),
      limit: t.Optional(t.String()),
      type:  t.Optional(t.Union([
        t.Literal('PORT'), t.Literal('DRY_PORT'), t.Literal('INLAND'),
        t.Literal('JUNCTION'), t.Literal('YARD'),
      ])),
    }),
    detail: { tags: ['Shared Master'], summary: 'List stations' },
  })

  // GET /shared-master/stations/:id
  .get('/stations/:id', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => getStationQuery(params.id, db))
    if (!result) return new Response(JSON.stringify({ error: 'Station not found' }), { status: 404 })
    return { data: result }
  }, {
    detail: { tags: ['Shared Master'], summary: 'Get station by ID' },
  })

  // POST /shared-master/stations — Holding only
  .post('/stations', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    requireHolding()({ user })
    const result = await withDbContext(user, (db) =>
      createStationCommand({
        code: body.code,
        name: body.name,
        city: body.city,
        type: body.type,
        ...(body.operator_org_id ? { operatorOrgId: body.operator_org_id } : {}),
        ...(body.location ? { location: body.location } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      code:            t.String(),
      name:            t.String(),
      city:            t.String(),
      type:            t.Union([
        t.Literal('PORT'), t.Literal('DRY_PORT'), t.Literal('INLAND'),
        t.Literal('JUNCTION'), t.Literal('YARD'),
      ]),
      operator_org_id: t.Optional(t.String()),
      location:        t.Optional(t.String()),
    }),
    detail: { tags: ['Shared Master'], summary: 'Create station (Holding only)' },
  })
