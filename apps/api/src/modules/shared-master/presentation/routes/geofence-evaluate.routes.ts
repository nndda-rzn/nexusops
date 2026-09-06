import { Elysia } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { getGeofenceQuery } from '@/modules/shared-master/application/queries/geofence.queries'
import { evaluateGeofenceQuery } from '@/modules/shared-master/application/queries/spatial.queries'
import { syncGeofenceMembership } from '@/modules/shared-master/application/queries/geofence-membership.queries'
import { eventBus } from '@/shared/events'
import type { GeofenceEnteredEvent, GeofenceExitedEvent } from '@/shared/events/event-types'

export const geofenceEvaluateRoutes = new Elysia({ prefix: '/shared-master' })
  .use(authMiddleware)

  // POST /shared-master/geofences/:id/evaluate
  // Check latest position per vehicle (org-scoped) against the geofence boundary,
  // sync membership state, and emit geofence.entered/exited once per transition.
  // Events are emitted AFTER the transaction commits (S6) — never inside
  // withDbContext, so async subscribers can't race the uncommitted state.
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

      return {
        geofence,
        inside: inside.map(r => r.vehicle_id),
        delta: {
          entered: delta.entered.map(r => r.vehicleId),
          exited: delta.exited.map(r => r.vehicleId),
        },
        enteredWithPosition: delta.entered,
      }
    })

    if (result instanceof Response) return result

    // Emit after commit — event payloads derived from committed state
    if (result.geofence.status === 'ACTIVE') {
      const now = new Date()
      const enteredEvents: GeofenceEnteredEvent[] = result.enteredWithPosition.map(r => ({
        type: 'geofence.entered',
        orgId: user.orgId,
        geofenceId: result.geofence.id,
        geofenceName: result.geofence.name,
        vehicleId: r.vehicleId,
        position: r.position,
        occurredAt: now,
      }))
      const exitedEvents: GeofenceExitedEvent[] = result.delta.exited.map(vehicleId => ({
        type: 'geofence.exited',
        orgId: user.orgId,
        geofenceId: result.geofence.id,
        geofenceName: result.geofence.name,
        vehicleId,
        position: '',
        occurredAt: now,
      }))
      await Promise.all([
        ...enteredEvents.map(e => eventBus.emit('geofence.entered', e)),
        ...exitedEvents.map(e => eventBus.emit('geofence.exited', e)),
      ])
    }

    return {
      data: {
        inside: result.inside,
        delta: result.delta,
      },
    }
  }, {
    detail: { tags: ['Shared Master'], summary: 'Evaluate vehicles inside geofence (sync membership, emit delta events)' },
  })