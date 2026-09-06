import { Elysia } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { getGeofenceQuery } from '@/modules/shared-master/application/queries/geofence.queries'
import { evaluateGeofenceQuery } from '@/modules/shared-master/application/queries/spatial.queries'
import { eventBus } from '@/shared/events'

export const geofenceEvaluateRoutes = new Elysia({ prefix: '/shared-master' })
  .use(authMiddleware)

  // POST /shared-master/geofences/:id/evaluate
  // Return vehicles currently inside the geofence (latest position per vehicle)
  // Emits geofence.entered for vehicles inside when geofence is ACTIVE
  .post('/geofences/:id/evaluate', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, async (db) => {
      const geofence = await getGeofenceQuery(params.id, db)
      if (!geofence) return new Response(JSON.stringify({ error: 'Geofence not found' }), { status: 404 })

      const rows = await evaluateGeofenceQuery(params.id, db)
      const inside = rows.filter(r => r.inside)

      if (geofence.status === 'ACTIVE') {
        await Promise.all(inside.map(r =>
          eventBus.emit('geofence.entered', {
            type: 'geofence.entered',
            geofenceId: geofence.id,
            geofenceName: geofence.name,
            vehicleId: r.vehicle_id,
            position: r.position,
            occurredAt: new Date(r.recorded_at),
          })
        ))
      }

      return { inside: inside.map(r => r.vehicle_id) }
    })
    if (result instanceof Response) return result
    return { data: result }
  }, {
    detail: { tags: ['Shared Master'], summary: 'Evaluate vehicles inside geofence' },
  })