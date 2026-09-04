import type { DbContext } from '@/shared/database/client'
import {
  operations,
  operationEvents,
} from '@/shared/database/schema/operations'
import { eq, and, desc, inArray } from 'drizzle-orm'
import { Operation } from '../../domain/entities/operation.entity'
import { OperationNotFoundError } from '../../domain/errors/operation.errors'
import { generateId } from '@/shared/ids'
import type { OperationEvent } from '../../domain/events/operation.events'
import type { OperationType, OperationStatus, OperationPriority } from '../../domain/entities/operation.entity'

// ─────────────────────────────────────────
// Mappers
// ─────────────────────────────────────────

function rowToOperation(row: typeof operations.$inferSelect): Operation {
  return Operation.reconstitute({
    id: row.id,
    orgId: row.orgId,
    type: row.type as OperationType,
    status: row.status as OperationStatus,
    priority: row.priority as OperationPriority,
    referenceId: row.referenceId ?? undefined,
    referenceType: row.referenceType ?? undefined,
    isCrossEntity: row.isCrossEntity,
    relatedEntityIds: row.relatedEntityIds ?? [],
    scheduledStart: row.scheduledStart ?? undefined,
    scheduledEnd: row.scheduledEnd ?? undefined,
    actualStart: row.actualStart ?? undefined,
    actualEnd: row.actualEnd ?? undefined,
    delayMinutes: row.delayMinutes,
    cancelledBy: row.cancelledBy ?? undefined,
    cancellationReason: row.cancellationReason ?? undefined,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  })
}

// ─────────────────────────────────────────
// Repository
// ─────────────────────────────────────────

export async function findOperationById(
  id: string,
  dbCtx: DbContext
): Promise<Operation | null> {
  const [row] = await dbCtx
    .select()
    .from(operations)
    .where(eq(operations.id, id))
    .limit(1)

  return row ? rowToOperation(row) : null
}

export async function findOperationByIdOrFail(
  id: string,
  dbCtx: DbContext
): Promise<Operation> {
  const operation = await findOperationById(id, dbCtx)
  if (!operation) throw new OperationNotFoundError(id)
  return operation
}

export async function saveOperation(
  operation: Operation,
  dbCtx: DbContext
): Promise<void> {
  await dbCtx
    .insert(operations)
    .values({
      id: operation.id,
      orgId: operation.orgId,
      type: operation.type,
      status: operation.status,
      priority: operation.priority,
      referenceId: operation.referenceId,
      referenceType: operation.referenceType,
      isCrossEntity: operation.isCrossEntity,
      relatedEntityIds: operation.relatedEntityIds,
      scheduledStart: operation.scheduledStart,
      scheduledEnd: operation.scheduledEnd,
      actualStart: operation.actualStart,
      actualEnd: operation.actualEnd,
      delayMinutes: operation.delayMinutes,
      cancelledBy: operation.cancelledBy,
      cancellationReason: operation.cancellationReason,
      createdBy: operation.createdBy,
      createdAt: operation.createdAt,
      updatedAt: operation.updatedAt,
    })
    .onConflictDoUpdate({
      target: operations.id,
      set: {
        status: operation.status,
        priority: operation.priority,
        actualStart: operation.actualStart,
        actualEnd: operation.actualEnd,
        delayMinutes: operation.delayMinutes,
        cancelledBy: operation.cancelledBy,
        cancellationReason: operation.cancellationReason,
        updatedAt: operation.updatedAt,
      },
    })
}

export async function appendOperationEvent(
  event: OperationEvent,
  actorId: string | undefined,
  dbCtx: DbContext
): Promise<void> {
  await dbCtx.insert(operationEvents).values({
    id: generateId(),
    orgId: ('orgId' in event ? event.orgId : '') as string,
    operationId: ('operationId' in event ? event.operationId : '') as string,
    eventType: event.type,
    payload: event as unknown as Record<string, unknown>,
    occurredAt: event.occurredAt,
    actorId,
    actorType: 'USER',
  })
}

export async function listOperations(
  orgId: string,
  filter: {
    status?: OperationStatus[]
    type?: OperationType[]
    limit?: number
    offset?: number
  },
  dbCtx: DbContext
) {
  const conditions = [eq(operations.orgId, orgId)]

  if (filter.status?.length) {
    conditions.push(inArray(operations.status, filter.status))
  }

  if (filter.type?.length) {
    conditions.push(inArray(operations.type, filter.type))
  }

  const limit = filter.limit ?? 20
  const offset = filter.offset ?? 0

  const rows = await dbCtx
    .select()
    .from(operations)
    .where(and(...conditions))
    .orderBy(desc(operations.scheduledStart))
    .limit(limit)
    .offset(offset)

  return rows.map(rowToOperation)
}
