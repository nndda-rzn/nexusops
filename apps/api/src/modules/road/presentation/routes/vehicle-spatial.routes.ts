import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { getNearbyVehiclesQuery } from '@/modules/shared-master/application/queries/spatial.queries'

export const vehicleSpatialRoutes = new Elysia({ prefix: '/road' })
  .use(authMiddleware)

  // GET /road/vehicles/nearby?lat=&lng=&radius_km=
  // Vehicles with latest position within radius of a point (GIST index)
  .get('/vehicles/nearby', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      getNearbyVehiclesQuery(user.orgId, query.lng, query.lat, query.radius_km, db)
    )
    return { data: result }
  }, {
    query: t.Object({
      lat:       t.Number(),
      lng:       t.Number(),
      radius_km: t.Number({ minimum: 0.1, maximum: 500 }),
    }),
    detail: { tags: ['Road'], summary: 'List vehicles near a point (km radius)' },
  })