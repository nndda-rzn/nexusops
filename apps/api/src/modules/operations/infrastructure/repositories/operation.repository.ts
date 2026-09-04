import type { DbContext } from '@/shared/database/client'
import { operations, operationEvents } from '@/shared/database/schema/operations'
import { eq, and, desc, inArray, sql } from 'drizzle-orm'
import { Operation } from '@/modules/operations/domain/entities/operation.entity'
import { OperationNotFoundError } from '@/modules/operations/domain/errors/operation.errors'
import { generateId } from '@/shared/ids'
import type { OperationEvent } from '@/modules/operations/domain/events/operation.events'
import type { OperationType, OperationStatus, OperationPriority } from '@/modules/operations/domain/entities/operation.entity'

function rowToOperation(row: typeof operations.$inferSelect): Operation {
  return Operation.reconstitute({
    id: row.id, orgId: row.orgId,
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

// S-01 FIX: orgId parameter added to prevent cross-tenant access
export async function findOperationById(
  id: string, orgId: string, db: DbContext
): Promise<Operation | null> {
  const [row] = await db.select().from(operations)
    .where(and(eq(operations.id, id), eq(operations.orgId, orgId)))
    .limit(1)
  return row ? rowToOperation(row) : null
}

export async function findOperationByIdOrFail(
  id: string, orgId: string, db: DbContext
): Promise<Operation> {
  const op = await findOperationById(id, orgId, db)
  if (!op) throw new OperationNotFoundError(id)
  return op
}

export async function saveOperation(operation: Operation, db: DbContext): Promise<void> {
  await db.insert(operations).values({
    id: operation.id, orgId: operation.orgId, type: operation.type,
    status: operation.status, priority: operation.priority,
    referenceId: operation.referenceId, referenceType: operation.referenceType,
    isCrossEntity: operation.isCrossEntity, relatedEntityIds: operation.relatedEntityIds,
    scheduledStart: operation.scheduledStart, scheduledEnd: operation.scheduledEnd,
    actualStart: operation.actualStart, actualEnd: operation.actualEnd,
    delayMinutes: operation.delayMinutes,
    cancelledBy: operation.cancelledBy, cancellationReason: operation.cancellationReason,
    createdBy: operation.createdBy, createdAt: operation.createdAt, updatedAt: operation.updatedAt,
  }).onConflictDoUpdate({
    target: operations.id,
    set: {
      status: operation.status, priority: operation.priority,
      actualStart: operation.actualStart, actualEnd: operation.actualEnd,
      delayMinutes: operation.delayMinutes,
      cancelledBy: operation.cancelledBy, cancellationReason: operation.cancellationReason,
      updatedAt: operation.updatedAt,
    },
  })
}

export async function appendOperationEvent(
  event: OperationEvent, actorId: string | undefined, db: DbContext
): Promise<void> {
  const orgId = 'orgId' in event ? event.orgId : undefined
  const operationId = 'operationId' in event ? event.operationId : undefined
  if (!orgId || !operationId) {
    throw new Error(`Event ${event.type} missing orgId or operationId`)
  }
  await db.insert(operationEvents).values({
    id: generateId(), orgId, operationId,
    eventType: event.type,
    payload: event as unknown as Record<string, unknown>,
    occurredAt: event.occurredAt, actorId, actorType: 'USER',
  })
}

export async function listOperations(
  orgId: string,
  filter: {
    status?: OperationStatus[] | undefined
    type?: OperationType[] | undefined
    limit?: number | undefined
    offset?: number | undefined
  },
  db: DbContext
) {
  const conditions = [eq(operations.orgId, orgId)]
  if (filter.status?.length) conditions.push(inArray(operations.status, filter.status))
  if (filter.type?.length) conditions.push(inArray(operations.type, filter.type))
  const limit = filter.limit ?? 20
  const offset = filter.offset ?? 0
  const rows = await db.select().from(operations)
    .where(and(...conditions))
    .orderBy(desc(operations.scheduledStart))
    .limit(limit).offset(offset)
  return rows.map(rowToOperation)
}

// Q-08 FIX: real COUNT(*) for pagination
export async function countOperations(
  orgId: string,
  filter: {
    status?: OperationStatus[] | undefined
    type?: OperationType[] | undefined
  },
  db: DbContext
): Promise<number> {
  const conditions = [eq(operations.orgId, orgId)]
  if (filter.status?.length) conditions.push(inArray(operations.status, filter.status))
  if (filter.type?.length) conditions.push(inArray(operations.type, filter.type))
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(operations)
    .where(and(...conditions))
  return result?.count ?? 0
}
