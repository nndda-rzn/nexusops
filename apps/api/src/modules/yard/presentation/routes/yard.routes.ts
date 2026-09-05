import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { listYardsQuery, listBlocksQuery } from '@/modules/yard/application/queries/yard.queries'
import { createYardCommand, createBlockCommand } from '@/modules/yard/application/commands/yard-resources.commands'

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
