import {
  findOperationByIdOrFail,
  saveOperation,
  appendOperationEvent,
} from "@/modules/operations/infrastructure/repositories/operation.repository";
import { eventBus } from "@/shared/events";
import type { DbContext } from "@/shared/database/client";
import type { OperationDelayedEvent } from "@/modules/operations/domain/events/operation.events";

export interface DelayOperationCommand {
  operationId: string;
  delayMinutes: number;
  actorId: string;
}

export async function delayOperationCommand(
  cmd: DelayOperationCommand,
  db: DbContext,
): Promise<void> {
  const operation = await findOperationByIdOrFail(cmd.operationId, db);

  operation.delay(cmd.delayMinutes);
  await saveOperation(operation, db);

  const event: OperationDelayedEvent = {
    type: "operation.delayed",
    operationId: operation.id,
    orgId: operation.orgId,
    operationType: operation.type,
    delayMinutes: cmd.delayMinutes,
    totalDelayMinutes: operation.delayMinutes,
    occurredAt: new Date(),
    actorId: cmd.actorId,
  };

  await appendOperationEvent(event, cmd.actorId, db);
  await eventBus.emit("operation.delayed", event);
}
