import type { DbContext } from "@/shared/database/client";
import { interventionRequests } from "@/shared/database/schema/operations";
import { generateId } from "@/shared/ids";
import { ForbiddenError } from "@/shared/errors";
import { eventBus } from "@/shared/events";
import type { InterventionRequestedEvent } from "@/modules/operations/domain/events/operation.events";

export interface RequestInterventionCommand {
  holdingOrgId: string;
  targetOrgId: string;
  operationId: string;
  interventionType:
    | "RESCHEDULE"
    | "REALLOCATE"
    | "CANCEL"
    | "REPRIORITIZE"
    | "EMERGENCY_STOP";
  reason: string;
  proposedChanges: Record<string, unknown>;
  requestedBy: string;
  entityType: string;
}

export interface RequestInterventionResult {
  interventionId: string;
  slaDeadline: Date;
  isEmergencyStop: boolean;
}

const SLA_MINUTES = 15;

export async function requestInterventionCommand(
  cmd: RequestInterventionCommand,
  db: DbContext,
): Promise<RequestInterventionResult> {
  if (cmd.entityType !== "HOLDING") {
    throw new ForbiddenError("Only Holding entity can request interventions.");
  }

  const slaDeadline = new Date(Date.now() + SLA_MINUTES * 60 * 1000);
  const id = generateId();
  const isEmergencyStop = cmd.interventionType === "EMERGENCY_STOP";

  await db.insert(interventionRequests).values({
    id,
    orgId: cmd.holdingOrgId,
    targetOrgId: cmd.targetOrgId,
    operationId: cmd.operationId,
    interventionType: cmd.interventionType,
    reason: cmd.reason,
    proposedChanges: cmd.proposedChanges,
    status: isEmergencyStop ? "EXECUTED" : "PENDING",
    requestedBy: cmd.requestedBy,
    slaDeadline,
    ...(isEmergencyStop
      ? {
          executedAt: new Date(),
          executionNotes: "Emergency stop — no approval required",
        }
      : {}),
    createdAt: new Date(),
  });

  const event: InterventionRequestedEvent = {
    type: "operation.intervention_requested",
    interventionId: id,
    orgId: cmd.holdingOrgId,
    targetOrgId: cmd.targetOrgId,
    operationId: cmd.operationId,
    interventionType: cmd.interventionType,
    slaDeadline,
    occurredAt: new Date(),
    requestedBy: cmd.requestedBy,
  };

  await eventBus.emit("operation.intervention_requested", event);

  return { interventionId: id, slaDeadline, isEmergencyStop };
}
