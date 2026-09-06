import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { listRoutesQuery, getRouteQuery } from '@/modules/road/application/queries/route.queries'
import { createRouteCommand } from '@/modules/road/application/commands/route.commands'
import { parsePaginationQuery } from '@/shared/pagination/query-helpers'

export const routesRoutes = new Elysia({ prefix: '/road' })
  .use(authMiddleware)

  // GET /road/routes
  .get('/routes', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listRoutesQuery(user.orgId, db, {
        ...parsePaginationQuery(query),
      })
    )
    return result
  }, {
    query: t.Object({
      page:  t.Optional(t.String()),
      limit: t.Optional(t.String()),
    }),
    detail: { tags: ['Road'], summary: 'List routes' },
  })

  // GET /road/routes/:id
  .get('/routes/:id', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => getRouteQuery(params.id, user.orgId, db))
    if (!result) return new Response(JSON.stringify({ error: 'Route not found' }), { status: 404 })
    return { data: result }
  }, {
    detail: { tags: ['Road'], summary: 'Get route by ID' },
  })

  // POST /road/routes
  .post('/routes', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      createRouteCommand({
        orgId: user.orgId,
        ...(body.origin ? { origin: body.origin } : {}),
        ...(body.destination ? { destination: body.destination } : {}),
        ...(body.geometry ? { geometry: body.geometry } : {}),
        distanceKm: body.distance_km,
        estimatedDurationMinutes: body.estimated_duration_minutes,
        ...(body.toll_cost ? { tollCost: body.toll_cost } : {}),
        routeType: body.route_type,
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      origin:                     t.Optional(t.String()),  // WKT POINT
      destination:                t.Optional(t.String()),  // WKT POINT
      geometry:                   t.Optional(t.String()),  // WKT LINESTRING
      distance_km:                t.String(),
      estimated_duration_minutes: t.Number(),
      toll_cost:                  t.Optional(t.String()),
      route_type:                 t.Union([t.Literal('HIGHWAY'), t.Literal('PROVINCIAL'), t.Literal('LOCAL'), t.Literal('TOLL')]),
    }),
    detail: { tags: ['Road'], summary: 'Create route' },
  })