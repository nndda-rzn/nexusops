import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext, requireHolding } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { listAirportsQuery, getAirportQuery } from '@/modules/shared-master/application/queries/list-airports.query'
import { createAirportCommand } from '@/modules/shared-master/application/commands/create-airport.command'
import { parsePaginationQuery } from '@/shared/pagination/query-helpers'

export const airportsRoutes = new Elysia({ prefix: '/shared-master' })
  .use(authMiddleware)

  // GET /shared-master/airports
  .get('/airports', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listAirportsQuery(db, {
        ...parsePaginationQuery(query),
      })
    )
    return result
  }, {
    query: t.Object({
      page:  t.Optional(t.String()),
      limit: t.Optional(t.String()),
    }),
    detail: { tags: ['Shared Master'], summary: 'List airports' },
  })

  // GET /shared-master/airports/:id
  .get('/airports/:id', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => getAirportQuery(params.id, db))
    if (!result) return new Response(JSON.stringify({ error: 'Airport not found' }), { status: 404 })
    return { data: result }
  }, {
    detail: { tags: ['Shared Master'], summary: 'Get airport by ID' },
  })

  // POST /shared-master/airports — Holding only
  .post('/airports', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    requireHolding()({ user })
    const result = await withDbContext(user, (db) =>
      createAirportCommand({
        iataCode: body.iata_code,
        icaoCode: body.icao_code,
        name: body.name,
        city: body.city,
        country: body.country,
        ...(body.operator_org_id ? { operatorOrgId: body.operator_org_id } : {}),
        ...(body.location ? { location: body.location } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      iata_code:       t.String({ minLength: 3, maxLength: 3 }),
      icao_code:       t.String({ minLength: 4, maxLength: 4 }),
      name:            t.String(),
      city:            t.String(),
      country:         t.String(),
      operator_org_id: t.Optional(t.String()),
      location:        t.Optional(t.String()),
    }),
    detail: { tags: ['Shared Master'], summary: 'Create airport (Holding only)' },
  })
