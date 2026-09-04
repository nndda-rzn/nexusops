import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { listVoyagesQuery } from '@/modules/maritime/application/queries/list-voyages.query'
import { createVoyageCommand } from '@/modules/maritime/application/commands/create-voyage.command'

export const voyagesRoutes = new Elysia({ prefix: '/maritime' })
  .use(authMiddleware)

  // GET /maritime/voyages
  .get('/voyages', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listVoyagesQuery(user.orgId, db, {
        ...(query.page ? { page: Number(query.page) } : {}),
        ...(query.limit ? { limit: Number(query.limit) } : {}),
        ...(query.vessel_id ? { vesselId: query.vessel_id } : {}),
      })
    )
    return result
  }, {
    query: t.Object({
      page:      t.Optional(t.String()),
      limit:     t.Optional(t.String()),
      vessel_id: t.Optional(t.String()),
    }),
    detail: { tags: ['Maritime'], summary: 'List voyages' },
  })

  // POST /maritime/voyages
  .post('/voyages', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      createVoyageCommand({
        orgId: user.orgId,
        voyageNumber: body.voyage_number,
        vesselId: body.vessel_id,
        ...(body.service_name ? { serviceName: body.service_name } : {}),
        ...(body.departure_port_id ? { departurePortId: body.departure_port_id } : {}),
        ...(body.destination_port_id ? { destinationPortId: body.destination_port_id } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      voyage_number:       t.String(),
      vessel_id:           t.String(),
      service_name:        t.Optional(t.String()),
      departure_port_id:   t.Optional(t.String()),
      destination_port_id: t.Optional(t.String()),
    }),
    detail: { tags: ['Maritime'], summary: 'Create voyage' },
  })
