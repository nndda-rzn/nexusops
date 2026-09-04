import { Elysia, t } from 'elysia'
import { authMiddleware, requireHolding } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { onboardEntityCommand } from '@/modules/identity/application/commands/onboard-entity.command'
import { listEntitiesQuery } from '@/modules/identity/application/queries/list-entities.query'
import { getEntityModulesQuery } from '@/modules/identity/application/queries/get-entity-modules.query'
import type { MODULE_BUNDLES } from '@/modules/identity/domain/entities/module-bundles'

export const entityRoutes = new Elysia({ prefix: '/admin/entities' })
  .use(authMiddleware)

  .get('/', async ({ user }) => {
    if (!user) throw new UnauthorizedError()
    requireHolding()({ user })
    const entities = await listEntitiesQuery({ holdingOrgId: user.holdingId })
    return { data: entities }
  }, {
    detail: { tags: ['Admin'], summary: 'List entities' },
  })

  .post('/', async ({ body, user }) => {
    if (!user) throw new UnauthorizedError()
    const result = await onboardEntityCommand({
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
        t.Literal('MARITIME'), t.Literal('RAIL'), t.Literal('ROAD'),
        t.Literal('WAREHOUSE'), t.Literal('AVIATION'),
      ]),
      timezone: t.Optional(t.String()),
      currency: t.Optional(t.String()),
    }),
    detail: { tags: ['Admin'], summary: 'Onboard new entity' },
  })

  .get('/:id/modules', async ({ params, user }) => {
    if (!user) throw new UnauthorizedError()
    requireHolding()({ user })
    const modules = await getEntityModulesQuery({ orgId: params.id })
    return { data: { modules } }
  }, {
    detail: { tags: ['Admin'], summary: 'Get entity modules' },
  })
