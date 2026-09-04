import { findOperationByIdOrFail } from "@/modules/operations/infrastructure/repositories/operation.repository";
import type { DbContext } from "@/shared/database/client";

export interface GetOperationQuery {
  operationId: string;
}

export async function getOperationQuery(
  query: GetOperationQuery,
  db: DbContext,
) {
  const op = await findOperationByIdOrFail(query.operationId, db);

  return {
    id: op.id,
    type: op.type,
    status: op.status,
    priority: op.priority,
    referenceId: op.referenceId,
    referenceType: op.referenceType,
    isCrossEntity: op.isCrossEntity,
    relatedEntityIds: op.relatedEntityIds,
    scheduledStart: op.scheduledStart,
    scheduledEnd: op.scheduledEnd,
    actualStart: op.actualStart,
    actualEnd: op.actualEnd,
    delayMinutes: op.delayMinutes,
    cancelledBy: op.cancelledBy,
    cancellationReason: op.cancellationReason,
    createdBy: op.createdBy,
    createdAt: op.createdAt,
    updatedAt: op.updatedAt,
  };
}
