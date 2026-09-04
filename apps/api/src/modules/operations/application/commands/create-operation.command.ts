import { generateId } from "@/shared/ids";
import { Operation } from "@/modules/operations/domain/entities/operation.entity";
import {
  saveOperation,
  appendOperationEvent,
} from "@/modules/operations/infrastructure/repositories/operation.repository";
import { eventBus } from "@/shared/events";
import type { DbContext } from "@/shared/database/client";
import type { CreateOperationProps } from "@/modules/operations/domain/entities/operation.entity";
import type { OperationCreatedEvent } from "@/modules/operations/domain/events/operation.events";

export type CreateOperationCommand = Omit<CreateOperationProps, never>;

export interface CreateOperationResult {
  id: string;
  status: string;
  type: string;
}

export async function createOperationCommand(
  cmd: CreateOperationCommand,
  db: DbContext,
): Promise<CreateOperationResult> {
  const id = generateId();
  const operation = Operation.create(id, cmd);

  await saveOperation(operation, db);

  const event: OperationCreatedEvent = {
    type: "operation.created",
    operationId: operation.id,
    orgId: operation.orgId,
    operationType: operation.type,
    referenceId: operation.referenceId,
    referenceType: operation.referenceType,
    scheduledStart: operation.scheduledStart,
    occurredAt: new Date(),
    actorId: cmd.createdBy,
  };

  await appendOperationEvent(event, cmd.createdBy, db);
  await eventBus.emit("operation.created", event);

  return { id: operation.id, status: operation.status, type: operation.type };
}
