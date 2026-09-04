-- Phase 2 Step 2: Rail domain schema
-- Train services, trainsets, trains, platform assignments, crew assignments

CREATE SCHEMA IF NOT EXISTS "rail";
--> statement-breakpoint

-- Enums
CREATE TYPE "rail"."train_status" AS ENUM(
  'SCHEDULED', 'TRAINSET_ASSIGNED', 'CREW_ASSIGNED', 'LOADING',
  'READY_TO_DEPART', 'EN_ROUTE', 'ARRIVED', 'UNLOADING',
  'COMPLETED', 'DELAYED', 'CANCELLED'
);
--> statement-breakpoint
CREATE TYPE "rail"."trainset_status" AS ENUM('AVAILABLE', 'IN_USE', 'MAINTENANCE');
--> statement-breakpoint
CREATE TYPE "rail"."crew_role" AS ENUM('DRIVER', 'ASSISTANT', 'CONDUCTOR');
--> statement-breakpoint
CREATE TYPE "rail"."train_frequency" AS ENUM('DAILY', 'WEEKLY', 'CUSTOM');
--> statement-breakpoint

-- Train Services
CREATE TABLE "rail"."train_services" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "service_code" text NOT NULL,
  "origin_station_id" text NOT NULL,
  "destination_station_id" text NOT NULL,
  "frequency" "rail"."train_frequency" NOT NULL,
  "commodity_type" text,
  "operator" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "train_services_org_idx" ON "rail"."train_services" ("org_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "train_services_org_code_unique" ON "rail"."train_services" ("org_id", "service_code");
--> statement-breakpoint

-- Trainsets
CREATE TABLE "rail"."trainsets" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "trainset_number" text NOT NULL,
  "locomotive_id" text,
  "capacity_teu" integer,
  "capacity_weight" numeric,
  "status" "rail"."trainset_status" NOT NULL DEFAULT 'AVAILABLE',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "trainsets_org_idx" ON "rail"."trainsets" ("org_id");
--> statement-breakpoint
CREATE INDEX "trainsets_org_status_idx" ON "rail"."trainsets" ("org_id", "status");
--> statement-breakpoint
CREATE UNIQUE INDEX "trainsets_org_number_unique" ON "rail"."trainsets" ("org_id", "trainset_number");
--> statement-breakpoint

-- Trains
CREATE TABLE "rail"."trains" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "service_id" text NOT NULL REFERENCES "rail"."train_services"("id"),
  "train_number" text NOT NULL,
  "trainset_id" text REFERENCES "rail"."trainsets"("id"),
  "scheduled_departure" timestamptz NOT NULL,
  "scheduled_arrival" timestamptz NOT NULL,
  "actual_departure" timestamptz,
  "actual_arrival" timestamptz,
  "status" "rail"."train_status" NOT NULL DEFAULT 'SCHEDULED',
  "delay_minutes" integer NOT NULL DEFAULT 0,
  "cancellation_reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "trains_org_idx" ON "rail"."trains" ("org_id");
--> statement-breakpoint
CREATE INDEX "trains_org_status_idx" ON "rail"."trains" ("org_id", "status");
--> statement-breakpoint
CREATE INDEX "trains_service_idx" ON "rail"."trains" ("org_id", "service_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "trains_org_number_unique" ON "rail"."trains" ("org_id", "train_number");
--> statement-breakpoint

-- Platform Assignments
CREATE TABLE "rail"."platform_assignments" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "train_id" text NOT NULL REFERENCES "rail"."trains"("id"),
  "station_id" text NOT NULL,
  "platform_number" text NOT NULL,
  "scheduled_arrival" timestamptz,
  "scheduled_departure" timestamptz,
  "actual_arrival" timestamptz,
  "actual_departure" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "platform_assignments_org_idx" ON "rail"."platform_assignments" ("org_id");
--> statement-breakpoint
CREATE INDEX "platform_assignments_train_idx" ON "rail"."platform_assignments" ("train_id");
--> statement-breakpoint

-- Crew Assignments
CREATE TABLE "rail"."crew_assignments" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "train_id" text NOT NULL REFERENCES "rail"."trains"("id"),
  "employee_id" text,
  "role" "rail"."crew_role" NOT NULL,
  "from_station_id" text NOT NULL,
  "to_station_id" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "crew_assignments_org_idx" ON "rail"."crew_assignments" ("org_id");
--> statement-breakpoint
CREATE INDEX "crew_assignments_train_idx" ON "rail"."crew_assignments" ("train_id");
--> statement-breakpoint

-- RLS
ALTER TABLE "rail"."train_services" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rail"."trainsets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rail"."trains" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rail"."platform_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rail"."crew_assignments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "rail_train_services_rls" ON "rail"."train_services"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "rail_trainsets_rls" ON "rail"."trainsets"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "rail_trains_rls" ON "rail"."trains"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "rail_platform_assignments_rls" ON "rail"."platform_assignments"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "rail_crew_assignments_rls" ON "rail"."crew_assignments"
  USING (org_id = current_setting('app.current_org_id', true));
