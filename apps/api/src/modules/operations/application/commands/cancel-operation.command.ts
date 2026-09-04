import {
  findOperationByIdOrFail,
  saveOperation,
  appendOperationEvent,
} from "@/modules/operations/infrastructure/repositories/operation.repository";
import { eventBus } from "@/shared/events";
import type { DbContext } from "@/shared/database/client";
import type { OperationCancelledEvent } from "@/modules/operations/domain/events/operation.events";

export interface CancelOperationCommand {
  operationId: string;
  reason: string;
  actorId: string;
}

export async function cancelOperationCommand(
  cmd: CancelOperationCommand,
  db: DbContext,
): Promise<void> {
  const operation = await findOperationByIdOrFail(cmd.operationId, db);

  operation.cancel(cmd.actorId, cmd.reason);
  await saveOperation(operation, db);

  const event: OperationCancelledEvent = {
    type: "operation.cancelled",
    operationId: operation.id,
    orgId: operation.orgId,
    operationType: operation.type,
    reason: cmd.reason,
    cancelledBy: cmd.actorId,
    occurredAt: new Date(),
  };

  await appendOperationEvent(event, cmd.actorId, db);
  await eventBus.emit("operation.cancelled", event);
}
