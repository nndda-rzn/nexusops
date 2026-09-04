import { generateId } from "@/shared/ids";
import {
  Container,
  isValidContainerNumber,
} from "@/modules/containers/domain/entities/container.entity";
import { saveContainer } from "@/modules/containers/infrastructure/repositories/container.repository";
import { eventBus } from "@/shared/events";
import { InvalidContainerNumberError } from "@/modules/containers/domain/errors/container.errors";
import type { DbContext } from "@/shared/database/client";
import type { CreateContainerProps } from "@/modules/containers/domain/entities/container.entity";

export type AnnounceContainerCommand = CreateContainerProps;

export interface AnnounceContainerResult {
  id: string;
  containerNumber: string;
  status: string;
}

export async function announceContainerCommand(
  cmd: AnnounceContainerCommand,
  db: DbContext,
): Promise<AnnounceContainerResult> {
  if (!isValidContainerNumber(cmd.containerNumber)) {
    throw new InvalidContainerNumberError(cmd.containerNumber);
  }

  const id = generateId();
  const container = Container.create(id, cmd);
  await saveContainer(container, db);

  await eventBus.emit("container.announced", {
    type: "container.announced",
    containerId: container.id,
    orgId: container.orgId,
    containerNumber: container.containerNumber,
    occurredAt: new Date(),
  });

  return {
    id: container.id,
    containerNumber: container.containerNumber,
    status: container.status,
  };
}
