-- Phase 3 Step 1: Assets domain schema
-- categories, assets, operator_assignments, lifecycle_events, locations, inspections

CREATE SCHEMA IF NOT EXISTS "assets";
--> statement-breakpoint

-- Enums
CREATE TYPE "assets"."asset_status" AS ENUM(
  'ACTIVE', 'IDLE', 'ASSIGNED_OUT', 'MAINTENANCE', 'BREAKDOWN',
  'INSPECTION', 'DECOMMISSIONED', 'DISPOSED'
);
--> statement-breakpoint
CREATE TYPE "assets"."asset_condition" AS ENUM('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL');
--> statement-breakpoint
CREATE TYPE "assets"."rate_unit" AS ENUM('PER_MOVE', 'PER_HOUR', 'PER_KM', 'PER_DAY');
--> statement-breakpoint
CREATE TYPE "assets"."operator_assignment_status" AS ENUM('ACTIVE', 'COMPLETED', 'CANCELLED');
--> statement-breakpoint
CREATE TYPE "assets"."location_type" AS ENUM(
  'TERMINAL', 'YARD', 'WAREHOUSE', 'WORKSHOP', 'RAIL_DEPOT', 'AIRPORT', 'EXTERNAL'
);
--> statement-breakpoint
CREATE TYPE "assets"."inspection_type" AS ENUM(
  'ROUTINE', 'PRE_OPERATION', 'POST_OPERATION', 'ANNUAL', 'SPECIAL'
);
--> statement-breakpoint
CREATE TYPE "assets"."inspection_result" AS ENUM('PASS', 'FAIL', 'CONDITIONAL');
--> statement-breakpoint

-- Categories
CREATE TABLE "assets"."categories" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "parent_category_id" text,
  "maintenance_interval_days" integer,
  "inspection_required" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "categories_org_idx" ON "assets"."categories" ("org_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "categories_org_code_unique" ON "assets"."categories" ("org_id", "code");
--> statement-breakpoint

-- Assets
CREATE TABLE "assets"."assets" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "asset_number" text NOT NULL,
  "category_id" text REFERENCES "assets"."categories"("id"),
  "name" text NOT NULL,
  "serial_number" text,
  "manufacturer" text,
  "model" text,
  "year_manufactured" integer,
  "year_acquired" integer,
  "acquisition_cost" numeric,
  "current_value" numeric,
  "owner_org_id" text NOT NULL,
  "operator_org_id" text,
  "status" "assets"."asset_status" NOT NULL DEFAULT 'ACTIVE',
  "condition" "assets"."asset_condition" NOT NULL DEFAULT 'GOOD',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "assets_org_idx" ON "assets"."assets" ("org_id");
--> statement-breakpoint
CREATE INDEX "assets_owner_idx" ON "assets"."assets" ("owner_org_id");
--> statement-breakpoint
CREATE INDEX "assets_status_idx" ON "assets"."assets" ("org_id", "status");
--> statement-breakpoint
CREATE UNIQUE INDEX "assets_org_number_unique" ON "assets"."assets" ("org_id", "asset_number");
--> statement-breakpoint

-- Operator Assignments
CREATE TABLE "assets"."operator_assignments" (
  "id" text PRIMARY KEY NOT NULL,
  "asset_id" text NOT NULL REFERENCES "assets"."assets"("id"),
  "owner_org_id" text NOT NULL,
  "operator_org_id" text NOT NULL,
  "assignment_start" timestamptz NOT NULL,
  "assignment_end" timestamptz,
  "internal_rate" numeric,
  "rate_unit" "assets"."rate_unit",
  "status" "assets"."operator_assignment_status" NOT NULL DEFAULT 'ACTIVE',
  "approved_by" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "operator_assignments_asset_idx" ON "assets"."operator_assignments" ("asset_id");
--> statement-breakpoint
CREATE INDEX "operator_assignments_owner_idx" ON "assets"."operator_assignments" ("owner_org_id");
--> statement-breakpoint
CREATE INDEX "operator_assignments_operator_idx" ON "assets"."operator_assignments" ("operator_org_id");
--> statement-breakpoint
CREATE INDEX "operator_assignments_status_idx" ON "assets"."operator_assignments" ("status");
--> statement-breakpoint

-- Lifecycle Events
CREATE TABLE "assets"."lifecycle_events" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "asset_id" text NOT NULL REFERENCES "assets"."assets"("id"),
  "event_type" text NOT NULL,
  "description" text,
  "occurred_at" timestamptz NOT NULL,
  "actor_id" text
);
--> statement-breakpoint
CREATE INDEX "lifecycle_events_org_idx" ON "assets"."lifecycle_events" ("org_id");
--> statement-breakpoint
CREATE INDEX "lifecycle_events_asset_idx" ON "assets"."lifecycle_events" ("asset_id");
--> statement-breakpoint

-- Asset Locations
CREATE TABLE "assets"."locations" (
  "id" text PRIMARY KEY NOT NULL,
  "asset_id" text NOT NULL REFERENCES "assets"."assets"("id"),
  "location_type" "assets"."location_type" NOT NULL,
  "location_id" text,
  "position" geometry(Point, 4326),
  "recorded_at" timestamptz NOT NULL
);
--> statement-breakpoint
CREATE INDEX "asset_locations_asset_idx" ON "assets"."locations" ("asset_id");
--> statement-breakpoint
CREATE INDEX "asset_locations_time_idx" ON "assets"."locations" ("asset_id", "recorded_at" DESC);
--> statement-breakpoint

-- Inspections
CREATE TABLE "assets"."inspections" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "asset_id" text NOT NULL REFERENCES "assets"."assets"("id"),
  "inspection_type" "assets"."inspection_type" NOT NULL,
  "result" "assets"."inspection_result" NOT NULL,
  "findings" text,
  "inspected_at" timestamptz NOT NULL,
  "inspector_id" text,
  "next_inspection_date" text,
  "work_order_id" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "inspections_org_idx" ON "assets"."inspections" ("org_id");
--> statement-breakpoint
CREATE INDEX "inspections_asset_idx" ON "assets"."inspections" ("asset_id");
--> statement-breakpoint
CREATE INDEX "inspections_result_idx" ON "assets"."inspections" ("org_id", "result");
--> statement-breakpoint

-- RLS
ALTER TABLE "assets"."categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assets"."assets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assets"."operator_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assets"."lifecycle_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assets"."locations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assets"."inspections" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- RLS policies — owner and operator can both read
CREATE POLICY "assets_categories_rls" ON "assets"."categories"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "assets_assets_rls" ON "assets"."assets"
  USING (
    owner_org_id = current_setting('app.current_org_id', true) OR
    operator_org_id = current_setting('app.current_org_id', true)
  );
--> statement-breakpoint
CREATE POLICY "assets_operator_assignments_rls" ON "assets"."operator_assignments"
  USING (
    owner_org_id = current_setting('app.current_org_id', true) OR
    operator_org_id = current_setting('app.current_org_id', true)
  );
--> statement-breakpoint
CREATE POLICY "assets_lifecycle_events_rls" ON "assets"."lifecycle_events"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "assets_locations_rls" ON "assets"."locations"
  USING (EXISTS (
    SELECT 1 FROM "assets"."assets" a
    WHERE a.id = asset_id
      AND (
        a.owner_org_id = current_setting('app.current_org_id', true) OR
        a.operator_org_id = current_setting('app.current_org_id', true)
      )
  ));
--> statement-breakpoint
CREATE POLICY "assets_inspections_rls" ON "assets"."inspections"
  USING (org_id = current_setting('app.current_org_id', true));
