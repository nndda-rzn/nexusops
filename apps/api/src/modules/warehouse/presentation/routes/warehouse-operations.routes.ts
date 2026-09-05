import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { listCycleCountsQuery } from '@/modules/warehouse/application/queries/warehouse.queries'
import { dispatchCargoCommand } from '@/modules/warehouse/application/commands/warehouse.commands'
import { completePutawayCommand, completePickingCommand } from '@/modules/warehouse/application/commands/warehouse-flow.commands'
import { conductCycleCountCommand, createCycleCountCommand } from '@/modules/warehouse/application/commands/warehouse-cycle-count.commands'

export const warehouseOperationsRoutes = new Elysia({ prefix: '/warehouse' })
  .use(authMiddleware)

  // P3R-03 FIX: complete receiving with putaway into inventory
  .post('/warehouses/:id/receivings/:receiveId/putaway', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      completePutawayCommand({
        orgId: user.orgId, warehouseId: params.id,
        receivingId: params.receiveId, items: body.items,
      }, db)
    )
    return { data: { message: 'Putaway completed.' } }
  }, {
    body: t.Object({
      items: t.Array(t.Object({
        sku:         t.String(),
        quantity:    t.String(),
        description: t.Optional(t.String()),
        location_id: t.Optional(t.String()),
        batch_number: t.Optional(t.String()),
        expiry_date: t.Optional(t.String()),
      })),
    }),
    detail: { tags: ['Warehouse'], summary: 'Complete putaway and add to inventory' },
  })

  // P3R-03 FIX: complete picking and decrement inventory
  .post('/warehouses/:id/pickings/:pickingId/complete', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      completePickingCommand({
        orgId: user.orgId, warehouseId: params.id,
        pickingId: params.pickingId, items: body.items,
      }, db)
    )
    return { data: { message: 'Picking completed.' } }
  }, {
    body: t.Object({
      items: t.Array(t.Object({ sku: t.String(), quantity: t.String() })),
    }),
    detail: { tags: ['Warehouse'], summary: 'Complete picking and decrement inventory' },
  })

  .post('/warehouses/:id/dispatches', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      dispatchCargoCommand({
        orgId: user.orgId, warehouseId: params.id,
        ...(body.shipment_id ? { shipmentId: body.shipment_id } : {}),
        ...(body.trip_id ? { tripId: body.trip_id } : {}),
        ...(body.vehicle_id ? { vehicleId: body.vehicle_id } : {}),
        ...(body.driver_id ? { driverId: body.driver_id } : {}),
        ...(body.dispatched_by ? { dispatchedBy: body.dispatched_by } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      shipment_id:   t.Optional(t.String()),
      trip_id:       t.Optional(t.String()),
      vehicle_id:    t.Optional(t.String()),
      driver_id:     t.Optional(t.String()),
      dispatched_by: t.Optional(t.String()),
    }),
    detail: { tags: ['Warehouse'], summary: 'Dispatch cargo' },
  })

  .get('/warehouses/:id/cycle-counts', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => listCycleCountsQuery(user.orgId, params.id, db))
    return { data: result }
  }, { detail: { tags: ['Warehouse'], summary: 'List cycle counts' } })

  .post('/warehouses/:id/cycle-counts', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      createCycleCountCommand({
        orgId: user.orgId, warehouseId: params.id,
        countType: body.count_type,
        ...(body.scheduled_at ? { scheduledAt: new Date(body.scheduled_at) } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      count_type:   t.Union([t.Literal('FULL'), t.Literal('PARTIAL'), t.Literal('SPOT')]),
      scheduled_at: t.Optional(t.String()),
    }),
    detail: { tags: ['Warehouse'], summary: 'Create cycle count' },
  })

  .post('/warehouses/:id/cycle-counts/:countId/conduct', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      conductCycleCountCommand({
        orgId: user.orgId, warehouseId: params.id,
        cycleCountId: params.countId,
        itemsCounted: body.items_counted,
        discrepanciesFound: body.discrepancies_found,
        ...(body.conducted_by ? { conductedBy: body.conducted_by } : {}),
      }, db)
    )
    return { data: { message: 'Cycle count completed.' } }
  }, {
    body: t.Object({
      items_counted:       t.Number({ minimum: 0 }),
      discrepancies_found: t.Number({ minimum: 0 }),
      conducted_by:        t.Optional(t.String()),
    }),
    detail: { tags: ['Warehouse'], summary: 'Conduct cycle count' },
  })
