import { Elysia } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { getGeofenceQuery } from '@/modules/shared-master/application/queries/geofence.queries'
import { evaluateGeofenceQuery } from '@/modules/shared-master/application/queries/spatial.queries'
import { syncGeofenceMembership } from '@/modules/shared-master/application/queries/geofence-membership.queries'
import { eventBus } from '@/shared/events'

export const geofenceEvaluateRoutes = new Elysia({ prefix: '/shared-master' })
  .use(authMiddleware)

  // POST /shared-master/geofences/:id/evaluate
  // Check latest position per vehicle (org-scoped) against the geofence boundary,
  // sync membership state, and emit geofence.entered/exited once per transition.
  // Returns current inside set + this poll's delta.
  .post('/geofences/:id/evaluate', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, async (db) => {
      const geofence = await getGeofenceQuery(params.id, db)
      if (!geofence) return new Response(JSON.stringify({ error: 'Geofence not found' }), { status: 404 })

      const rows = await evaluateGeofenceQuery(params.id, user.orgId, db)
      const inside = rows.filter(r => r.inside)

      const delta = await syncGeofenceMembership(
        geofence.id,
        user.orgId,
        inside.map(r => ({ vehicleId: r.vehicle_id, position: r.position })),
        db
      )

      if (geofence.status === 'ACTIVE') {
        await Promise.all([
          ...delta.entered.map(r =>
            eventBus.emit('geofence.entered', {
              type: 'geofence.entered',
              orgId: user.orgId,
              geofenceId: geofence.id,
              geofenceName: geofence.name,
              vehicleId: r.vehicleId,
              position: r.position,
              occurredAt: new Date(),
            })
          ),
          ...delta.exited.map(r =>
            eventBus.emit('geofence.exited', {
              type: 'geofence.exited',
              orgId: user.orgId,
              geofenceId: geofence.id,
              geofenceName: geofence.name,
              vehicleId: r.vehicleId,
              position: '',
              occurredAt: new Date(),
            })
          ),
        ])
      }

      return {
        inside: inside.map(r => r.vehicle_id),
        delta: {
          entered: delta.entered.map(r => r.vehicleId),
          exited: delta.exited.map(r => r.vehicleId),
        },
      }
    })
    if (result instanceof Response) return result
    return { data: result }
  }, {
    detail: { tags: ['Shared Master'], summary: 'Evaluate vehicles inside geofence (sync membership, emit delta events)' },
  })