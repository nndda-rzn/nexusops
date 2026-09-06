import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext, requireModule, requireHolding } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { db } from '@/shared/database/client'
import { listKpisQuery } from '@/modules/analytics/application/queries/analytics.queries'
import { refreshAnalyticsCommand } from '@/modules/analytics/application/commands/refresh-analytics.command'

const KPI_DOMAINS = t.Union([t.Literal('road'), t.Literal('maritime')])

export const analyticsRoutes = new Elysia({ prefix: '/analytics' })
  .use(authMiddleware)
  .onBeforeHandle(requireModule('analytics'))

  .get('/kpis', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (requestDb) =>
      listKpisQuery(user.orgId, query.domain, requestDb, {
        ...(query.from ? { from: query.from } : {}),
        ...(query.to ? { to: query.to } : {}),
      })
    )
    return { data: result }
  }, {
    query: t.Object({
      domain: KPI_DOMAINS,
      from: t.Optional(t.String()),
      to: t.Optional(t.String()),
    }),
    detail: { tags: ['Analytics'], summary: 'List daily operational KPIs' },
  })

  .post('/refresh', async ({ user }) => {
    if (!user) throw new UnauthorizedError()
    requireHolding()({ user })
    await refreshAnalyticsCommand(db)
    return { data: { message: 'Analytics materialized views refreshed.' } }
  }, {
    detail: { tags: ['Analytics'], summary: 'Refresh analytics materialized views (Holding only)' },
  })
