import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { parsePaginationQuery } from '@/shared/pagination/query-helpers'
import { listWarehousesQuery, getWarehouseQuery, listReceivingsQuery, listInventoryQuery } from '@/modules/warehouse/application/queries/warehouse.queries'
import { createWarehouseCommand, receiveCargoCommand, adjustInventoryCommand, startPickingCommand } from '@/modules/warehouse/application/commands/warehouse.commands'

export const warehouseRoutes = new Elysia({ prefix: '/warehouse' })
  .use(authMiddleware)

  .get('/warehouses', async ({ user }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => listWarehousesQuery(user.orgId, db))
    return { data: result }
  }, { detail: { tags: ['Warehouse'], summary: 'List warehouses' } })

  .get('/warehouses/:id', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => getWarehouseQuery(params.id, user.orgId, db))
    return { data: result }
  }, { detail: { tags: ['Warehouse'], summary: 'Get warehouse by ID' } })

  .post('/warehouses', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      createWarehouseCommand({
        orgId: user.orgId, code: body.code, name: body.name, type: body.type,
        ...(body.total_area_m2 ? { totalAreaM2: body.total_area_m2 } : {}),
        ...(body.usable_area_m2 ? { usableAreaM2: body.usable_area_m2 } : {}),
        ...(body.location ? { location: body.location } : {}),
        ...(body.boundary ? { boundary: body.boundary } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      code:           t.String(),
      name:           t.String(),
      type:           t.Union([t.Literal('GENERAL'), t.Literal('BONDED'), t.Literal('COLD_CHAIN'), t.Literal('HAZMAT'), t.Literal('CONSOLIDATION')]),
      total_area_m2:  t.Optional(t.String()),
      usable_area_m2: t.Optional(t.String()),
      location:       t.Optional(t.String()),
      boundary:       t.Optional(t.String()),
    }),
    detail: { tags: ['Warehouse'], summary: 'Create warehouse' },
  })

  .get('/warehouses/:id/receivings', async ({ user, params, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listReceivingsQuery(user.orgId, params.id, db, parsePaginationQuery(query))
    )
    return result
  }, {
    query: t.Object({ page: t.Optional(t.String()), limit: t.Optional(t.String()) }),
    detail: { tags: ['Warehouse'], summary: 'List receivings' },
  })

  .post('/warehouses/:id/receivings', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      receiveCargoCommand({
        orgId: user.orgId, warehouseId: params.id,
        referenceNumber: body.reference_number,
        ...(body.shipment_id ? { shipmentId: body.shipment_id } : {}),
        ...(body.received_by ? { receivedBy: body.received_by } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      reference_number: t.String(),
      shipment_id:      t.Optional(t.String()),
      received_by:      t.Optional(t.String()),
    }),
    detail: { tags: ['Warehouse'], summary: 'Receive cargo' },
  })

  .get('/warehouses/:id/inventory', async ({ user, params, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listInventoryQuery(user.orgId, params.id, db, {
        ...parsePaginationQuery(query),
        ...(query.sku ? { sku: query.sku } : {}),
      })
    )
    return result
  }, {
    query: t.Object({ page: t.Optional(t.String()), limit: t.Optional(t.String()), sku: t.Optional(t.String()) }),
    detail: { tags: ['Warehouse'], summary: 'List inventory' },
  })

  .post('/warehouses/:id/inventory/adjust', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      adjustInventoryCommand({
        orgId: user.orgId, warehouseId: params.id,
        sku: body.sku, quantityOnHand: body.quantity_on_hand,
        ...(body.description ? { description: body.description } : {}),
        ...(body.location_id ? { locationId: body.location_id } : {}),
        ...(body.batch_number ? { batchNumber: body.batch_number } : {}),
        ...(body.expiry_date ? { expiryDate: body.expiry_date } : {}),
        ...(body.condition ? { condition: body.condition } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      sku:              t.String(),
      quantity_on_hand: t.String(),
      description:      t.Optional(t.String()),
      location_id:      t.Optional(t.String()),
      batch_number:     t.Optional(t.String()),
      expiry_date:      t.Optional(t.String()),
      condition:        t.Optional(t.Union([t.Literal('GOOD'), t.Literal('DAMAGED'), t.Literal('QUARANTINE')])),
    }),
    detail: { tags: ['Warehouse'], summary: 'Adjust inventory' },
  })

  .post('/warehouses/:id/pickings', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      startPickingCommand({
        orgId: user.orgId, warehouseId: params.id,
        ...(body.order_id ? { orderId: body.order_id } : {}),
        ...(body.picker_id ? { pickerId: body.picker_id } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({ order_id: t.Optional(t.String()), picker_id: t.Optional(t.String()) }),
    detail: { tags: ['Warehouse'], summary: 'Start picking' },
  })
