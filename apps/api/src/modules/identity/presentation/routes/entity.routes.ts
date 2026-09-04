import { Elysia, t } from 'elysia'
import { authMiddleware, requireHolding } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import {
  onboardEntityHandler,
  listEntitiesHandler,
  getEntityModulesHandler,
} from '@/modules/identity/application/commands/entity.commands'
import { MODULE_BUNDLES } from '@/modules/identity/domain/entities/module-bundles'

export const entityRoutes = new Elysia({ prefix: '/admin/entities' })
  .use(authMiddleware)

  // ─────────────────────────────────────────
  // GET /admin/entities
  // List all entities under holding (Holding only)
  // ─────────────────────────────────────────
  .get('/', async ({ user }) => {
    if (!user) throw new UnauthorizedError()
    requireHolding()({ user })

    const entities = await listEntitiesHandler(user.holdingId)
    return { data: entities }
  }, {
    detail: {
      tags: ['Admin'],
      summary: 'List entities',
    },
  })

  // ─────────────────────────────────────────
  // POST /admin/entities
  // Onboard new entity (Holding only)
  // ─────────────────────────────────────────
  .post('/', async ({ body, user }) => {
    if (!user) throw new UnauthorizedError()

    const result = await onboardEntityHandler({
      holdingOrgId: user.holdingId,
      name: body.name,
      slug: body.slug,
      entityType: body.entity_type as keyof typeof MODULE_BUNDLES,
      timezone: body.timezone,
      currency: body.currency,
      actor: user,
    })

    return { data: result }
  }, {
    body: t.Object({
      name: t.String({ minLength: 2 }),
      slug: t.String({ minLength: 2, pattern: '^[a-z0-9-]+$' }),
      entity_type: t.Union([
        t.Literal('MARITIME'),
        t.Literal('RAIL'),
        t.Literal('ROAD'),
        t.Literal('WAREHOUSE'),
        t.Literal('AVIATION'),
      ]),
      timezone: t.Optional(t.String()),
      currency: t.Optional(t.String()),
    }),
    detail: {
      tags: ['Admin'],
      summary: 'Onboard new entity',
    },
  })

  // ─────────────────────────────────────────
  // GET /admin/entities/:id/modules
  // Get modules for an entity
  // ─────────────────────────────────────────
  .get('/:id/modules', async ({ params, user }) => {
    if (!user) throw new UnauthorizedError()
    requireHolding()({ user })

    const modules = await getEntityModulesHandler({ orgId: params.id })
    return { data: { modules } }
  }, {
    detail: {
      tags: ['Admin'],
      summary: 'Get entity modules',
    },
  })
