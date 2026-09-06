import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext, requireHolding } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { listGeofencesQuery, getGeofenceQuery } from '@/modules/shared-master/application/queries/geofence.queries'
import {
  createGeofenceCommand,
  updateGeofenceCommand,
  setGeofenceStatusCommand,
  assertGeofenceNameAvailable,
} from '@/modules/shared-master/application/commands/geofence.commands'
import { parsePaginationQuery } from '@/shared/pagination/query-helpers'

export const geofencesRoutes = new Elysia({ prefix: '/shared-master' })
  .use(authMiddleware)

  // GET /shared-master/geofences
  .get('/geofences', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listGeofencesQuery(db, {
        ...parsePaginationQuery(query),
        ...(query.type
          ? { geofenceType: query.type as 'TERMINAL' | 'PORT' | 'STATION' | 'WAREHOUSE' | 'AIRPORT' | 'CUSTOM' }
          : {}),
        ...(query.status ? { status: query.status as 'ACTIVE' | 'INACTIVE' } : {}),
      })
    )
    return result
  }, {
    query: t.Object({
      page:   t.Optional(t.String()),
      limit:  t.Optional(t.String()),
      type:   t.Optional(t.Union([
        t.Literal('TERMINAL'), t.Literal('PORT'), t.Literal('STATION'),
        t.Literal('WAREHOUSE'), t.Literal('AIRPORT'), t.Literal('CUSTOM'),
      ])),
      status: t.Optional(t.Union([t.Literal('ACTIVE'), t.Literal('INACTIVE')])),
    }),
    detail: { tags: ['Shared Master'], summary: 'List geofences' },
  })

  // GET /shared-master/geofences/:id
  .get('/geofences/:id', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => getGeofenceQuery(params.id, db))
    if (!result) return new Response(JSON.stringify({ error: 'Geofence not found' }), { status: 404 })
    return { data: result }
  }, {
    detail: { tags: ['Shared Master'], summary: 'Get geofence by ID' },
  })

  // POST /shared-master/geofences — Holding only
  .post('/geofences', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    requireHolding()({ user })
    const result = await withDbContext(user, async (db) => {
      await assertGeofenceNameAvailable(body.name, db)
      return createGeofenceCommand({
        name: body.name,
        geofenceType: body.type,
        boundary: body.boundary,
        ...(body.reference_id ? { referenceId: body.reference_id } : {}),
      }, db)
    })
    return { data: result }
  }, {
    body: t.Object({
      name:         t.String(),
      type:         t.Union([
        t.Literal('TERMINAL'), t.Literal('PORT'), t.Literal('STATION'),
        t.Literal('WAREHOUSE'), t.Literal('AIRPORT'), t.Literal('CUSTOM'),
      ]),
      boundary:     t.String(),  // WKT Polygon
      reference_id: t.Optional(t.String()),
    }),
    detail: { tags: ['Shared Master'], summary: 'Create geofence (Holding only)' },
  })

  // PATCH /shared-master/geofences/:id — Holding only
  .patch('/geofences/:id', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    requireHolding()({ user })
    const result = await withDbContext(user, async (db) => {
      if (body.name !== undefined) await assertGeofenceNameAvailable(body.name, db, params.id)
      return updateGeofenceCommand({
        id: params.id,
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.boundary !== undefined ? { boundary: body.boundary } : {}),
        ...(body.reference_id !== undefined ? { referenceId: body.reference_id } : {}),
      }, db)
    })
    return { data: result }
  }, {
    body: t.Object({
      name:         t.Optional(t.String()),
      boundary:     t.Optional(t.String()),
      reference_id: t.Optional(t.String()),
    }),
    detail: { tags: ['Shared Master'], summary: 'Update geofence (Holding only)' },
  })

  // PATCH /shared-master/geofences/:id/status — Holding only
  .patch('/geofences/:id/status', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    requireHolding()({ user })
    const result = await withDbContext(user, (db) =>
      setGeofenceStatusCommand(params.id, body.status, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      status: t.Union([t.Literal('ACTIVE'), t.Literal('INACTIVE')]),
    }),
    detail: { tags: ['Shared Master'], summary: 'Activate/deactivate geofence (Holding only)' },
  })