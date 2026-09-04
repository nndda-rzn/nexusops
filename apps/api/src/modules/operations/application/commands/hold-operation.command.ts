import {
  findOperationByIdOrFail,
  saveOperation,
  appendOperationEvent,
} from "@/modules/operations/infrastructure/repositories/operation.repository";
import { eventBus } from "@/shared/events";
import type { DbContext } from "@/shared/database/client";

export interface HoldOperationCommand {
  operationId: string;
  orgId: string;
  actorId: string;
}

export async function holdOperationCommand(
  cmd: HoldOperationCommand,
  db: DbContext,
): Promise<void> {
  const operation = await findOperationByIdOrFail(
    cmd.operationId,
    cmd.orgId,
    db,
  );
  operation.hold();
  await saveOperation(operation, db);
  await appendOperationEvent(
    {
      type: "operation.status_changed",
      operationId: operation.id,
      orgId: operation.orgId,
      from: "IN_PROGRESS",
      to: "ON_HOLD",
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
    from: "IN_PROGRESS",
    to: "ON_HOLD",
    occurredAt: new Date(),
    actorId: cmd.actorId,
  });
}
