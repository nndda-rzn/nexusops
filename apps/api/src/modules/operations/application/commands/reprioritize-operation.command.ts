import {
  findOperationByIdOrFail,
  saveOperation,
} from "@/modules/operations/infrastructure/repositories/operation.repository";
import type { DbContext } from "@/shared/database/client";
import type { OperationPriority } from "@/modules/operations/domain/entities/operation.entity";

export interface ReprioritizeOperationCommand {
  operationId: string;
  orgId: string;
  priority: OperationPriority;
  actorId: string;
}

export async function reprioritizeOperationCommand(
  cmd: ReprioritizeOperationCommand,
  db: DbContext,
): Promise<void> {
  const operation = await findOperationByIdOrFail(
    cmd.operationId,
    cmd.orgId,
    db,
  );
  operation.reprioritize(cmd.priority);
  await saveOperation(operation, db);
}
