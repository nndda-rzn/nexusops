import { listOperations } from '@/modules/operations/infrastructure/repositories/operation.repository'
import { normalizePagination, toOffset, paginate } from '@/shared/pagination'
import type { DbContext } from '@/shared/database/client'
import type { OperationStatus, OperationType } from '@/modules/operations/domain/entities/operation.entity'

export interface ListOperationsQuery {
  orgId: string
  status?: OperationStatus[] | undefined
  type?: OperationType[] | undefined
  page?: number | undefined
  limit?: number | undefined
}

export async function listOperationsQuery(
  query: ListOperationsQuery,
  db: DbContext
) {
  const { page, limit } = normalizePagination({ page: query.page, limit: query.limit })
  const offset = toOffset(page, limit)

  const items = await listOperations(
    query.orgId,
    {
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      limit,
      offset,
    },
    db
  )

  const total = items.length < limit ? offset + items.length : offset + items.length + 1

  return paginate(
    items.map(op => ({
      id: op.id,
      type: op.type,
      status: op.status,
      priority: op.priority,
      referenceId: op.referenceId,
      referenceType: op.referenceType,
      scheduledStart: op.scheduledStart,
      scheduledEnd: op.scheduledEnd,
      actualStart: op.actualStart,
      actualEnd: op.actualEnd,
      delayMinutes: op.delayMinutes,
      isCrossEntity: op.isCrossEntity,
      createdAt: op.createdAt,
    })),
    page,
    limit,
    total
  )
}
