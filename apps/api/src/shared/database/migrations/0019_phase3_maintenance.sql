-- Phase 3 Step 2: Maintenance domain schema
-- work_orders, maintenance_plans, failures, spare_parts, work_order_parts

CREATE SCHEMA IF NOT EXISTS "maintenance";
--> statement-breakpoint

-- Enums
CREATE TYPE "maintenance"."work_order_type" AS ENUM('PREVENTIVE', 'CORRECTIVE', 'INSPECTION', 'EMERGENCY');
--> statement-breakpoint
CREATE TYPE "maintenance"."work_order_priority" AS ENUM('LOW', 'NORMAL', 'HIGH', 'CRITICAL');
--> statement-breakpoint
CREATE TYPE "maintenance"."work_order_status" AS ENUM(
  'DRAFT', 'APPROVED', 'SCHEDULED', 'ASSIGNED', 'IN_PROGRESS',
  'PENDING_PARTS', 'COMPLETED', 'CLOSED'
);
--> statement-breakpoint
CREATE TYPE "maintenance"."maintenance_plan_type" AS ENUM('TIME_BASED', 'USAGE_BASED', 'CONDITION_BASED');
--> statement-breakpoint
CREATE TYPE "maintenance"."maintenance_plan_status" AS ENUM('ACTIVE', 'PAUSED', 'ARCHIVED');
--> statement-breakpoint
CREATE TYPE "maintenance"."failure_severity" AS ENUM('MINOR', 'MAJOR', 'CRITICAL');
--> statement-breakpoint

-- Work Orders
CREATE TABLE "maintenance"."work_orders" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "work_order_number" text NOT NULL,
  "asset_id" text NOT NULL,
  "type" "maintenance"."work_order_type" NOT NULL,
  "priority" "maintenance"."work_order_priority" NOT NULL DEFAULT 'NORMAL',
  "title" text NOT NULL,
  "description" text,
  "status" "maintenance"."work_order_status" NOT NULL DEFAULT 'DRAFT',
  "assigned_to" text,
  "approved_by" text,
  "approved_at" timestamptz,
  "scheduled_start" timestamptz,
  "scheduled_end" timestamptz,
  "actual_start" timestamptz,
  "actual_end" timestamptz,
  "estimated_duration_hours" numeric,
  "actual_duration_hours" numeric,
  "labor_cost" numeric,
  "parts_cost" numeric,
  "total_cost" numeric,
  "created_by" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "work_orders_org_idx" ON "maintenance"."work_orders" ("org_id");
--> statement-breakpoint
CREATE INDEX "work_orders_asset_idx" ON "maintenance"."work_orders" ("org_id", "asset_id");
--> statement-breakpoint
CREATE INDEX "work_orders_status_idx" ON "maintenance"."work_orders" ("org_id", "status");
--> statement-breakpoint
CREATE UNIQUE INDEX "work_orders_org_number_unique" ON "maintenance"."work_orders" ("org_id", "work_order_number");
--> statement-breakpoint

-- Maintenance Plans
CREATE TABLE "maintenance"."maintenance_plans" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "asset_id" text NOT NULL,
  "plan_type" "maintenance"."maintenance_plan_type" NOT NULL,
  "interval_days" integer,
  "interval_hours" numeric,
  "tasks" jsonb,
  "estimated_duration_hours" numeric,
  "next_due_date" date,
  "last_completed_at" timestamptz,
  "status" "maintenance"."maintenance_plan_status" NOT NULL DEFAULT 'ACTIVE',
  "created_by" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "maintenance_plans_org_idx" ON "maintenance"."maintenance_plans" ("org_id");
--> statement-breakpoint
CREATE INDEX "maintenance_plans_asset_idx" ON "maintenance"."maintenance_plans" ("org_id", "asset_id");
--> statement-breakpoint
CREATE INDEX "maintenance_plans_status_idx" ON "maintenance"."maintenance_plans" ("org_id", "status");
--> statement-breakpoint

-- Failures
CREATE TABLE "maintenance"."failures" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "asset_id" text NOT NULL,
  "failure_type" text NOT NULL,
  "description" text NOT NULL,
  "severity" "maintenance"."failure_severity" NOT NULL,
  "detected_at" timestamptz NOT NULL,
  "detected_by" text,
  "work_order_id" text,
  "downtime_start" timestamptz,
  "downtime_end" timestamptz,
  "downtime_minutes" integer,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "failures_org_idx" ON "maintenance"."failures" ("org_id");
--> statement-breakpoint
CREATE INDEX "failures_asset_idx" ON "maintenance"."failures" ("org_id", "asset_id");
--> statement-breakpoint
CREATE INDEX "failures_severity_idx" ON "maintenance"."failures" ("org_id", "severity");
--> statement-breakpoint

-- Spare Parts
CREATE TABLE "maintenance"."spare_parts" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "part_number" text NOT NULL,
  "name" text NOT NULL,
  "quantity_on_hand" numeric NOT NULL DEFAULT 0,
  "quantity_reserved" numeric NOT NULL DEFAULT 0,
  "reorder_point" numeric NOT NULL DEFAULT 0,
  "unit_cost" numeric,
  "supplier" text,
  "lead_time_days" integer,
  "location" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "spare_parts_org_idx" ON "maintenance"."spare_parts" ("org_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "spare_parts_org_number_unique" ON "maintenance"."spare_parts" ("org_id", "part_number");
--> statement-breakpoint

-- Work Order Parts
CREATE TABLE "maintenance"."work_order_parts" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "work_order_id" text NOT NULL REFERENCES "maintenance"."work_orders"("id"),
  "spare_part_id" text NOT NULL REFERENCES "maintenance"."spare_parts"("id"),
  "quantity_used" numeric NOT NULL,
  "unit_cost" numeric,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "work_order_parts_org_idx" ON "maintenance"."work_order_parts" ("org_id");
--> statement-breakpoint
CREATE INDEX "work_order_parts_wo_idx" ON "maintenance"."work_order_parts" ("work_order_id");
--> statement-breakpoint

-- RLS
ALTER TABLE "maintenance"."work_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maintenance"."maintenance_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maintenance"."failures" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maintenance"."spare_parts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maintenance"."work_order_parts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "maintenance_work_orders_rls" ON "maintenance"."work_orders"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "maintenance_plans_rls" ON "maintenance"."maintenance_plans"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "maintenance_failures_rls" ON "maintenance"."failures"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "maintenance_spare_parts_rls" ON "maintenance"."spare_parts"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "maintenance_work_order_parts_rls" ON "maintenance"."work_order_parts"
  USING (org_id = current_setting('app.current_org_id', true));
