import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { createShipmentCommand } from '@/modules/shipments/application/commands/create-shipment.command'
import { updateShipmentStatusCommand } from '@/modules/shipments/application/commands/update-shipment-status.command'
import { getShipmentQuery, listShipmentsQuery } from '@/modules/shipments/application/queries/shipment.queries'
import { parsePaginationQuery } from '@/shared/pagination/query-helpers'

export const shipmentRoutes = new Elysia({ prefix: '/shipments' })
  .use(authMiddleware)

  // GET /shipments
  .get('/', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    return withDbContext(user, (db) =>
      listShipmentsQuery(user.orgId, {
        status: query.status,
        ...parsePaginationQuery(query),
      }, db)
    )
  }, {
    query: t.Object({
      status: t.Optional(t.String()),
      page:   t.Optional(t.String()),
      limit:  t.Optional(t.String()),
    }),
    detail: { tags: ['Shipments'], summary: 'List shipments' },
  })

  // GET /shipments/:id
  .get('/:id', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      getShipmentQuery(params.id, user.orgId, db)
    )
    return { data: result }
  }, {
    detail: { tags: ['Shipments'], summary: 'Get shipment by ID' },
  })

  // POST /shipments
  .post('/', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      createShipmentCommand({
        orgId: user.orgId,
        shipmentType: body.shipment_type as 'GROUP' | 'ENTITY' | undefined,
        referenceNumber: body.reference_number,
        origin: body.origin,
        destination: body.destination,
        ...(body.cargo_type ? { cargoType: body.cargo_type } : {}),
        ...(body.customer_id ? { customerId: body.customer_id } : {}),
        createdBy: user.id,
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      reference_number: t.String(),
      origin:           t.String(),
      destination:      t.String(),
      shipment_type:    t.Optional(t.Union([t.Literal('GROUP'), t.Literal('ENTITY')])),
      cargo_type:       t.Optional(t.String()),
      customer_id:      t.Optional(t.String()),
    }),
    detail: { tags: ['Shipments'], summary: 'Create shipment' },
  })

  // PATCH /shipments/:id/status
  .patch('/:id/status', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      updateShipmentStatusCommand({
        shipmentId: params.id,
        orgId: user.orgId,
        status: body.status as 'BOOKED' | 'IN_TRANSIT' | 'AT_TERMINAL' | 'CUSTOMS_CLEARANCE' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED',
        actorId: user.id,
      }, db)
    )
    return { data: { message: 'Shipment status updated.' } }
  }, {
    body: t.Object({
      status: t.Union([
        t.Literal('BOOKED'), t.Literal('IN_TRANSIT'), t.Literal('AT_TERMINAL'),
        t.Literal('CUSTOMS_CLEARANCE'), t.Literal('DELIVERED'),
        t.Literal('COMPLETED'), t.Literal('CANCELLED'),
      ]),
    }),
    detail: { tags: ['Shipments'], summary: 'Update shipment status' },
  })
