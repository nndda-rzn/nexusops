import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { parsePaginationQuery } from '@/shared/pagination/query-helpers'
import { listYardsQuery, listBlocksQuery, listSlotsQuery } from '@/modules/yard/application/queries/yard.queries'
import { createYardCommand, createBlockCommand, placeContainerCommand, moveContainerInYardCommand, removeContainerFromYardCommand, reserveSlotCommand } from '@/modules/yard/application/commands/yard.commands'

export const yardRoutes = new Elysia({ prefix: '/yard' })
  .use(authMiddleware)

  .get('/yards', async ({ user }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => listYardsQuery(user.orgId, db))
    return { data: result }
  }, { detail: { tags: ['Yard'], summary: 'List yards' } })

  .post('/yards', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      createYardCommand({
        orgId: user.orgId, terminalId: body.terminal_id,
        code: body.code, name: body.name, type: body.type,
        ...(body.total_capacity_teu !== undefined ? { totalCapacityTeu: body.total_capacity_teu } : {}),
        ...(body.boundary ? { boundary: body.boundary } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      terminal_id:        t.String(),
      code:               t.String(),
      name:               t.String(),
      type:               t.Union([t.Literal('IMPORT'), t.Literal('EXPORT'), t.Literal('TRANSSHIP'), t.Literal('REEFER'), t.Literal('HAZMAT'), t.Literal('EMPTY')]),
      total_capacity_teu: t.Optional(t.Number()),
      boundary:           t.Optional(t.String()),
    }),
    detail: { tags: ['Yard'], summary: 'Create yard' },
  })

  .get('/yards/:id/blocks', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => listBlocksQuery(user.orgId, params.id, db))
    return { data: result }
  }, { detail: { tags: ['Yard'], summary: 'List blocks in yard' } })

  .post('/yards/:id/blocks', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      createBlockCommand({
        orgId: user.orgId, yardId: params.id,
        code: body.code, blockType: body.block_type,
        bayCount: body.bay_count, rowCount: body.row_count,
        ...(body.max_tier !== undefined ? { maxTier: body.max_tier } : {}),
        ...(body.equipment_type ? { equipmentType: body.equipment_type } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      code:           t.String(),
      block_type:     t.Union([t.Literal('IMPORT'), t.Literal('EXPORT'), t.Literal('REEFER'), t.Literal('EMPTY'), t.Literal('HAZMAT')]),
      bay_count:      t.Number({ minimum: 1 }),
      row_count:      t.Number({ minimum: 1 }),
      max_tier:       t.Optional(t.Number()),
      equipment_type: t.Optional(t.Union([t.Literal('RTG'), t.Literal('RMG'), t.Literal('STRADDLE')])),
    }),
    detail: { tags: ['Yard'], summary: 'Create block in yard' },
  })

  .get('/blocks/:id/slots', async ({ user, params, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listSlotsQuery(user.orgId, params.id, db, {
        ...parsePaginationQuery(query),
        ...(query.status ? { status: query.status } : {}),
      })
    )
    return result
  }, {
    query: t.Object({
      page:   t.Optional(t.String()),
      limit:  t.Optional(t.String()),
      status: t.Optional(t.Union([t.Literal('EMPTY'), t.Literal('OCCUPIED'), t.Literal('RESERVED'), t.Literal('BLOCKED')])),
    }),
    detail: { tags: ['Yard'], summary: 'List slots in block' },
  })

  .post('/slots/:id/place', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      placeContainerCommand({
        orgId: user.orgId, slotId: params.id,
        containerId: body.container_id,
        ...(body.movement_type ? { movementType: body.movement_type } : {}),
        ...(body.equipment_id ? { equipmentId: body.equipment_id } : {}),
        ...(body.operator_id ? { operatorId: body.operator_id } : {}),
      }, db)
    )
    return { data: { message: 'Container placed in slot.' } }
  }, {
    body: t.Object({
      container_id:  t.String(),
      movement_type: t.Optional(t.Union([t.Literal('INBOUND'), t.Literal('OUTBOUND'), t.Literal('RESHUFFLE'), t.Literal('SHIFT')])),
      equipment_id:  t.Optional(t.String()),
      operator_id:   t.Optional(t.String()),
    }),
    detail: { tags: ['Yard'], summary: 'Place container in slot' },
  })

  .post('/slots/:id/move', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      moveContainerInYardCommand({
        orgId: user.orgId, fromSlotId: params.id,
        toSlotId: body.to_slot_id, containerId: body.container_id,
        ...(body.equipment_id ? { equipmentId: body.equipment_id } : {}),
        ...(body.operator_id ? { operatorId: body.operator_id } : {}),
      }, db)
    )
    return { data: { message: 'Container moved.' } }
  }, {
    body: t.Object({
      to_slot_id:   t.String(),
      container_id: t.String(),
      equipment_id: t.Optional(t.String()),
      operator_id:  t.Optional(t.String()),
    }),
    detail: { tags: ['Yard'], summary: 'Move container within yard' },
  })

  .post('/slots/:id/remove', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      removeContainerFromYardCommand({
        orgId: user.orgId, slotId: params.id,
        containerId: body.container_id,
        ...(body.equipment_id ? { equipmentId: body.equipment_id } : {}),
        ...(body.operator_id ? { operatorId: body.operator_id } : {}),
      }, db)
    )
    return { data: { message: 'Container removed from slot.' } }
  }, {
    body: t.Object({
      container_id: t.String(),
      equipment_id: t.Optional(t.String()),
      operator_id:  t.Optional(t.String()),
    }),
    detail: { tags: ['Yard'], summary: 'Remove container from yard slot' },
  })

  .post('/slots/:id/reserve', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      reserveSlotCommand({ orgId: user.orgId, slotId: params.id, reservedFor: body.reserved_for }, db)
    )
    return { data: { message: 'Slot reserved.' } }
  }, {
    body: t.Object({ reserved_for: t.String() }),
    detail: { tags: ['Yard'], summary: 'Reserve slot for incoming container' },
  })
