import {
  findOperationByIdOrFail,
  saveOperation,
  appendOperationEvent,
} from "@/modules/operations/infrastructure/repositories/operation.repository";
import { eventBus } from "@/shared/events";
import type { DbContext } from "@/shared/database/client";
import type { OperationCompletedEvent } from "@/modules/operations/domain/events/operation.events";

export interface CompleteOperationCommand {
  operationId: string;
  actorId: string;
}

export async function completeOperationCommand(
  cmd: CompleteOperationCommand,
  db: DbContext,
): Promise<void> {
  const operation = await findOperationByIdOrFail(cmd.operationId, db);

  operation.complete();
  await saveOperation(operation, db);

  const event: OperationCompletedEvent = {
    type: "operation.completed",
    operationId: operation.id,
    orgId: operation.orgId,
    operationType: operation.type,
    actualEnd: operation.actualEnd!,
    occurredAt: new Date(),
    actorId: cmd.actorId,
  };

  await appendOperationEvent(event, cmd.actorId, db);
  await eventBus.emit("operation.completed", event);
}
