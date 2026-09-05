-- Phase 4D: Resource Allocation

CREATE TYPE "planning"."resource_allocation_status" AS ENUM('PLANNED', 'CONFIRMED', 'IN_USE', 'RELEASED');
--> statement-breakpoint

CREATE TABLE "planning"."resource_allocations" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "plan_id" text REFERENCES "planning"."plans"("id"),
  "resource_type" text NOT NULL,
  "resource_id" text NOT NULL,
  "allocated_to_type" text NOT NULL,
  "allocated_to_id" text NOT NULL,
  "start_time" timestamptz NOT NULL,
  "end_time" timestamptz NOT NULL,
  "quantity" integer NOT NULL DEFAULT 1,
  "status" "planning"."resource_allocation_status" NOT NULL DEFAULT 'PLANNED',
  "version" integer NOT NULL DEFAULT 1,
  "created_by" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "resource_allocations_org_idx" ON "planning"."resource_allocations" ("org_id");
--> statement-breakpoint
CREATE INDEX "resource_allocations_plan_idx" ON "planning"."resource_allocations" ("plan_id");
--> statement-breakpoint
CREATE INDEX "resource_allocations_resource_idx" ON "planning"."resource_allocations" ("resource_type", "resource_id");
--> statement-breakpoint
CREATE INDEX "resource_allocations_target_idx" ON "planning"."resource_allocations" ("allocated_to_type", "allocated_to_id");
--> statement-breakpoint

ALTER TABLE "planning"."resource_allocations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "planning_resource_allocations_rls" ON "planning"."resource_allocations"
  USING ("org_id" = current_setting('app.current_org_id', true));