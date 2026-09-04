import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { listOperationsQuery } from '@/modules/operations/application/queries/list-operations.query'
import { getOperationQuery } from '@/modules/operations/application/queries/get-operation.query'
import type { OperationStatus, OperationType } from '@/modules/operations/domain/entities/operation.entity'
import { parsePaginationQuery } from '@/shared/pagination/query-helpers'

export const listOperationsRoutes = new Elysia({ prefix: '/operations' })
  .use(authMiddleware)

  .get('/', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const statusRaw = query.status
    const typeRaw = query.type
    const status = statusRaw
      ? (Array.isArray(statusRaw) ? statusRaw : [statusRaw]) as OperationStatus[]
      : undefined
    const type = typeRaw
      ? (Array.isArray(typeRaw) ? typeRaw : [typeRaw]) as OperationType[]
      : undefined
    return withDbContext(user, (db) =>
      listOperationsQuery({
        orgId: user.orgId,
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
        ...parsePaginationQuery(query),
      }, db)
    )
  }, {
    query: t.Object({
      status: t.Optional(t.Union([t.String(), t.Array(t.String())])),
      type:   t.Optional(t.Union([t.String(), t.Array(t.String())])),
      page:   t.Optional(t.String()),
      limit:  t.Optional(t.String()),
    }),
    detail: { tags: ['Operations'], summary: 'List operations' },
  })

  .get('/:id', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    return withDbContext(user, (db) =>
      getOperationQuery({ operationId: params.id, orgId: user.orgId }, db)
    )
  }, {
    detail: { tags: ['Operations'], summary: 'Get operation by ID' },
  })
