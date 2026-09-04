import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext, requireHolding } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { listPortsQuery, getPortQuery } from '@/modules/shared-master/application/queries/list-ports.query'
import { createPortCommand } from '@/modules/shared-master/application/commands/create-port.command'
import { parsePaginationQuery } from '@/shared/pagination/query-helpers'

export const portsRoutes = new Elysia({ prefix: '/shared-master' })
  .use(authMiddleware)

  // GET /shared-master/ports
  .get('/ports', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listPortsQuery(db, {
        ...parsePaginationQuery(query),
        ...(query.type ? { type: query.type as 'SEA' | 'RIVER' | 'INLAND' } : {}),
      })
    )
    return result
  }, {
    query: t.Object({
      page:  t.Optional(t.String()),
      limit: t.Optional(t.String()),
      type:  t.Optional(t.Union([t.Literal('SEA'), t.Literal('RIVER'), t.Literal('INLAND')])),
    }),
    detail: { tags: ['Shared Master'], summary: 'List ports' },
  })

  // GET /shared-master/ports/:id
  .get('/ports/:id', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => getPortQuery(params.id, db))
    if (!result) return new Response(JSON.stringify({ error: 'Port not found' }), { status: 404 })
    return { data: result }
  }, {
    detail: { tags: ['Shared Master'], summary: 'Get port by ID' },
  })

  // POST /shared-master/ports — Holding only
  .post('/ports', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    requireHolding()({ user })
    const result = await withDbContext(user, (db) =>
      createPortCommand({
        code: body.code,
        name: body.name,
        country: body.country,
        city: body.city,
        type: body.type,
        ...(body.location ? { location: body.location } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      code:     t.String(),
      name:     t.String(),
      country:  t.String(),
      city:     t.String(),
      type:     t.Union([t.Literal('SEA'), t.Literal('RIVER'), t.Literal('INLAND')]),
      location: t.Optional(t.String()),
    }),
    detail: { tags: ['Shared Master'], summary: 'Create port (Holding only)' },
  })
