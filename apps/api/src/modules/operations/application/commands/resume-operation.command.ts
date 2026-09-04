import {
  findOperationByIdOrFail,
  saveOperation,
  appendOperationEvent,
} from "@/modules/operations/infrastructure/repositories/operation.repository";
import { eventBus } from "@/shared/events";
import type { DbContext } from "@/shared/database/client";

export interface ResumeOperationCommand {
  operationId: string;
  orgId: string;
  actorId: string;
}

export async function resumeOperationCommand(
  cmd: ResumeOperationCommand,
  db: DbContext,
): Promise<void> {
  const operation = await findOperationByIdOrFail(
    cmd.operationId,
    cmd.orgId,
    db,
  );
  operation.resume();
  await saveOperation(operation, db);
  await appendOperationEvent(
    {
      type: "operation.status_changed",
      operationId: operation.id,
      orgId: operation.orgId,
      from: "ON_HOLD",
      to: "SCHEDULED",
      occurredAt: new Date(),
      actorId: cmd.actorId,
    },
    cmd.actorId,
    db,
  );
  await eventBus.emit("operation.status_changed", {
    type: "operation.status_changed",
    operationId: operation.id,
    orgId: operation.orgId,
    from: "ON_HOLD",
    to: "SCHEDULED",
    occurredAt: new Date(),
    actorId: cmd.actorId,
  });
}
