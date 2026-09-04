import { Elysia, t } from "elysia";
import { authMiddleware, withDbContext } from "@/shared/auth/middleware";
import { UnauthorizedError } from "@/shared/errors";
import { requestInterventionCommand } from "@/modules/operations/application/commands/request-intervention.command";
import { respondInterventionCommand } from "@/modules/operations/application/commands/respond-intervention.command";

export const interventionRoutes = new Elysia({ prefix: "/operations" })
  .use(authMiddleware)

  // POST /operations/interventions — Holding request intervention
  .post(
    "/interventions",
    async ({ user, body }) => {
      if (!user) throw new UnauthorizedError();

      const result = await withDbContext(user, (db) =>
        requestInterventionCommand(
          {
            holdingOrgId: user.orgId,
            targetOrgId: body.target_org_id,
            operationId: body.operation_id,
            interventionType: body.intervention_type as
              | "RESCHEDULE"
              | "REALLOCATE"
              | "CANCEL"
              | "REPRIORITIZE"
              | "EMERGENCY_STOP",
            reason: body.reason,
            proposedChanges: body.proposed_changes ?? {},
            requestedBy: user.id,
            entityType: user.entityType,
          },
          db,
        ),
      );

      return { data: result };
    },
    {
      body: t.Object({
        target_org_id: t.String(),
        operation_id: t.String(),
        intervention_type: t.Union([
          t.Literal("RESCHEDULE"),
          t.Literal("REALLOCATE"),
          t.Literal("CANCEL"),
          t.Literal("REPRIORITIZE"),
          t.Literal("EMERGENCY_STOP"),
        ]),
        reason: t.String({ minLength: 1 }),
        proposed_changes: t.Optional(t.Record(t.String(), t.Unknown())),
      }),
      detail: {
        tags: ["Operations"],
        summary: "Request intervention (Holding only)",
      },
    },
  )

  // POST /operations/interventions/:id/respond — Entity respond to intervention
  .post(
    "/interventions/:id/respond",
    async ({ user, params, body }) => {
      if (!user) throw new UnauthorizedError();

      await withDbContext(user, (db) =>
        respondInterventionCommand(
          {
            interventionId: params.id,
            respondedBy: user.id,
            response: body.response as "APPROVE" | "REJECT",
            ...(body.rejection_reason
              ? { rejectionReason: body.rejection_reason }
              : {}),
            targetOrgId: user.orgId,
          },
          db,
        ),
      );

      return {
        data: { message: `Intervention ${body.response.toLowerCase()}d.` },
      };
    },
    {
      body: t.Object({
        response: t.Union([t.Literal("APPROVE"), t.Literal("REJECT")]),
        rejection_reason: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Operations"],
        summary: "Respond to intervention request",
      },
    },
  );
