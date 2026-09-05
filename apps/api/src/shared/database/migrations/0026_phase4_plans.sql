-- Phase 4C: Planning Engine — plans, schedules, scenarios, constraints

CREATE TYPE "planning"."plan_type" AS ENUM('BERTH', 'CRANE', 'YARD', 'WORKFORCE', 'ROUTE', 'TRAIN', 'NETWORK');
--> statement-breakpoint
CREATE TYPE "planning"."plan_status" AS ENUM('DRAFT', 'ACTIVE', 'SUPERSEDED', 'ARCHIVED');
--> statement-breakpoint
CREATE TYPE "planning"."schedule_status" AS ENUM('PLANNED', 'CONFIRMED', 'IN_USE', 'RELEASED');
--> statement-breakpoint
CREATE TYPE "planning"."scenario_status" AS ENUM('CANDIDATE', 'SELECTED', 'REJECTED');
--> statement-breakpoint
CREATE TYPE "planning"."constraint_type" AS ENUM('HARD', 'SOFT');
--> statement-breakpoint

-- Plans
CREATE TABLE "planning"."plans" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "name" text NOT NULL,
  "plan_type" "planning"."plan_type" NOT NULL,
  "status" "planning"."plan_status" NOT NULL DEFAULT 'DRAFT',
  "valid_from" timestamptz,
  "valid_until" timestamptz,
  "optimization_job_id" text REFERENCES "planning"."optimization_jobs"("id"),
  "scenario_id" text,
  "created_by" text NOT NULL,
  "approved_by" text,
  "approved_at" timestamptz,
  "activated_at" timestamptz,
  "superseded_by" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "plans_org_idx" ON "planning"."plans" ("org_id");
--> statement-breakpoint
CREATE INDEX "plans_org_status_idx" ON "planning"."plans" ("org_id", "status");
--> statement-breakpoint
CREATE INDEX "plans_org_type_idx" ON "planning"."plans" ("org_id", "plan_type");
--> statement-breakpoint

-- Schedules
CREATE TABLE "planning"."schedules" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "plan_id" text NOT NULL REFERENCES "planning"."plans"("id"),
  "resource_type" text NOT NULL,
  "resource_id" text NOT NULL,
  "start_time" timestamptz NOT NULL,
  "end_time" timestamptz NOT NULL,
  "operation_id" text,
  "status" "planning"."schedule_status" NOT NULL DEFAULT 'PLANNED',
  "metadata" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "schedules_org_idx" ON "planning"."schedules" ("org_id");
--> statement-breakpoint
CREATE INDEX "schedules_plan_idx" ON "planning"."schedules" ("plan_id");
--> statement-breakpoint
CREATE INDEX "schedules_resource_idx" ON "planning"."schedules" ("resource_type", "resource_id");
--> statement-breakpoint

-- Scenarios
CREATE TABLE "planning"."scenarios" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "plan_type" "planning"."plan_type" NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "optimization_job_id" text REFERENCES "planning"."optimization_jobs"("id"),
  "metrics" jsonb,
  "status" "planning"."scenario_status" NOT NULL DEFAULT 'CANDIDATE',
  "created_by" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "scenarios_org_idx" ON "planning"."scenarios" ("org_id");
--> statement-breakpoint
CREATE INDEX "scenarios_org_type_idx" ON "planning"."scenarios" ("org_id", "plan_type");
--> statement-breakpoint
CREATE INDEX "scenarios_job_idx" ON "planning"."scenarios" ("optimization_job_id");
--> statement-breakpoint

-- Constraints
CREATE TABLE "planning"."constraints" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "plan_type" "planning"."plan_type" NOT NULL,
  "constraint_type" text NOT NULL,
  "description" text,
  "value" jsonb,
  "is_hard" boolean NOT NULL DEFAULT true,
  "created_by" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "constraints_org_idx" ON "planning"."constraints" ("org_id");
--> statement-breakpoint
CREATE INDEX "constraints_org_type_idx" ON "planning"."constraints" ("org_id", "plan_type");
--> statement-breakpoint

-- RLS
ALTER TABLE "planning"."plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "planning"."schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "planning"."scenarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "planning"."constraints" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "planning_plans_rls" ON "planning"."plans"
  USING ("org_id" = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "planning_schedules_rls" ON "planning"."schedules"
  USING ("org_id" = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "planning_scenarios_rls" ON "planning"."scenarios"
  USING ("org_id" = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "planning_constraints_rls" ON "planning"."constraints"
  USING ("org_id" = current_setting('app.current_org_id', true));