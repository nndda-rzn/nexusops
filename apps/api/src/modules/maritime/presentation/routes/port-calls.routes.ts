import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { listPortCallsQuery } from '@/modules/maritime/application/queries/list-port-calls.query'
import { getPortCallQuery } from '@/modules/maritime/application/queries/get-port-call.query'
import { announcePortCallCommand } from '@/modules/maritime/application/commands/announce-port-call.command'

export const portCallsRoutes = new Elysia({ prefix: '/maritime' })
  .use(authMiddleware)

  // GET /maritime/port-calls
  .get('/port-calls', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listPortCallsQuery(user.orgId, db, {
        ...(query.page ? { page: Number(query.page) } : {}),
        ...(query.limit ? { limit: Number(query.limit) } : {}),
        ...(query.voyage_id ? { voyageId: query.voyage_id } : {}),
      })
    )
    return result
  }, {
    query: t.Object({
      page:      t.Optional(t.String()),
      limit:     t.Optional(t.String()),
      voyage_id: t.Optional(t.String()),
    }),
    detail: { tags: ['Maritime'], summary: 'List port calls' },
  })

  // GET /maritime/port-calls/:id
  .get('/port-calls/:id', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => getPortCallQuery(params.id, user.orgId, db))
    return { data: result }
  }, { detail: { tags: ['Maritime'], summary: 'Get port call by ID' } })

  // POST /maritime/port-calls
  .post('/port-calls', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      announcePortCallCommand({
        orgId: user.orgId, voyageId: body.voyage_id,
        ...(body.port_id ? { portId: body.port_id } : {}),
        ...(body.eta ? { eta: new Date(body.eta) } : {}),
        ...(body.etb ? { etb: new Date(body.etb) } : {}),
        ...(body.etd ? { etd: new Date(body.etd) } : {}),
        ...(body.agent_id ? { agentId: body.agent_id } : {}),
        ...(body.notes ? { notes: body.notes } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      voyage_id: t.String(),
      port_id:   t.Optional(t.String()),
      eta:       t.Optional(t.String()),
      etb:       t.Optional(t.String()),
      etd:       t.Optional(t.String()),
      agent_id:  t.Optional(t.String()),
      notes:     t.Optional(t.String()),
    }),
    detail: { tags: ['Maritime'], summary: 'Announce port call' },
  })
