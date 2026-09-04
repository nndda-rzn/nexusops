import {
  findContainerByIdOrFail,
  saveContainer,
} from "@/modules/containers/infrastructure/repositories/container.repository";
import { appendContainerMovement } from "@/modules/containers/infrastructure/repositories/container-movement.repository";
import { containerHolds } from "@/shared/database/schema/containers";
import { eq, and } from "drizzle-orm";
import { ContainerHoldActiveError } from "@/modules/containers/domain/errors/container.errors";
import { eventBus } from "@/shared/events";
import type { DbContext } from "@/shared/database/client";

export interface GateInContainerCommand {
  containerId: string;
  orgId: string;
  gateId: string;
  actorId: string;
}

export async function gateInContainerCommand(
  cmd: GateInContainerCommand,
  db: DbContext,
): Promise<void> {
  const container = await findContainerByIdOrFail(
    cmd.containerId,
    cmd.orgId,
    db,
  );

  const [activeHold] = await db
    .select()
    .from(containerHolds)
    .where(
      and(
        eq(containerHolds.containerId, cmd.containerId),
        eq(containerHolds.orgId, container.orgId),
        eq(containerHolds.status, "ACTIVE"),
      ),
    )
    .limit(1);

  if (activeHold)
    throw new ContainerHoldActiveError(cmd.containerId, activeHold.holdType);

  const prevLocationType = container.currentLocationType;
  const prevLocationId = container.currentLocationId;

  container.transitionTo("IN_YARD");
  container.move("yard", cmd.gateId);
  await saveContainer(container, db);

  await appendContainerMovement(
    {
      containerId: container.id,
      orgId: container.orgId,
      movementType: "GATE_IN",
      fromLocationType: prevLocationType,
      fromLocationId: prevLocationId,
      toLocationType: "gate",
      toLocationId: cmd.gateId,
      operatorId: cmd.actorId,
    },
    db,
  );

  await eventBus.emit("container.gate_in", {
    type: "container.gate_in",
    containerId: container.id,
    orgId: container.orgId,
    containerNumber: container.containerNumber,
    gateId: cmd.gateId,
    occurredAt: new Date(),
    actorId: cmd.actorId,
  });
}
