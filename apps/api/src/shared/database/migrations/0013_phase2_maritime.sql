-- Phase 2 Step 1: Maritime domain schema
-- Vessels, voyages, port calls, berth assignments, pilot/tug assignments, vessel positions (AIS)

CREATE SCHEMA IF NOT EXISTS "maritime";
--> statement-breakpoint

-- Enums
CREATE TYPE "maritime"."vessel_type" AS ENUM('CONTAINER', 'BULK', 'TANKER', 'RORO', 'GENERAL_CARGO', 'LNG', 'LPG');
--> statement-breakpoint
CREATE TYPE "maritime"."vessel_status" AS ENUM('ACTIVE', 'IN_VOYAGE', 'MAINTENANCE', 'LAID_UP');
--> statement-breakpoint
CREATE TYPE "maritime"."voyage_status" AS ENUM('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
--> statement-breakpoint
CREATE TYPE "maritime"."port_call_status" AS ENUM(
  'ANNOUNCED', 'ETA_CONFIRMED', 'PILOTAGE_REQUESTED', 'PILOTAGE_ASSIGNED',
  'ARRIVED_ANCHORAGE', 'BERTHING', 'BERTHED', 'OPERATIONS',
  'OPERATIONS_COMPLETED', 'UNBERTHING', 'DEPARTED', 'CANCELLED'
);
--> statement-breakpoint
CREATE TYPE "maritime"."berth_assignment_status" AS ENUM('PLANNED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
--> statement-breakpoint
CREATE TYPE "maritime"."pilot_assignment_type" AS ENUM('INBOUND', 'OUTBOUND');
--> statement-breakpoint
CREATE TYPE "maritime"."pilot_assignment_status" AS ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
--> statement-breakpoint

-- Vessels
CREATE TABLE "maritime"."vessels" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "imo_number" text NOT NULL,
  "mmsi" text,
  "name" text NOT NULL,
  "type" "maritime"."vessel_type" NOT NULL,
  "flag" text,
  "gross_tonnage" numeric,
  "loa" numeric,
  "beam" numeric,
  "max_draft" numeric,
  "teu_capacity" integer,
  "owner" text,
  "operator" text,
  "status" "maritime"."vessel_status" NOT NULL DEFAULT 'ACTIVE',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "vessels_org_id_idx" ON "maritime"."vessels" ("org_id");
--> statement-breakpoint
CREATE INDEX "vessels_org_status_idx" ON "maritime"."vessels" ("org_id", "status");
--> statement-breakpoint
CREATE UNIQUE INDEX "vessels_org_imo_unique" ON "maritime"."vessels" ("org_id", "imo_number");
--> statement-breakpoint

-- Voyages
CREATE TABLE "maritime"."voyages" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "voyage_number" text NOT NULL,
  "vessel_id" text NOT NULL REFERENCES "maritime"."vessels"("id"),
  "service_name" text,
  "departure_port_id" text,
  "destination_port_id" text,
  "status" "maritime"."voyage_status" NOT NULL DEFAULT 'PLANNED',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "voyages_org_id_idx" ON "maritime"."voyages" ("org_id");
--> statement-breakpoint
CREATE INDEX "voyages_vessel_idx" ON "maritime"."voyages" ("org_id", "vessel_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "voyages_org_number_unique" ON "maritime"."voyages" ("org_id", "voyage_number");
--> statement-breakpoint

-- Port Calls
CREATE TABLE "maritime"."port_calls" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "voyage_id" text NOT NULL REFERENCES "maritime"."voyages"("id"),
  "port_id" text,
  "eta" timestamptz,
  "etb" timestamptz,
  "etd" timestamptz,
  "ata" timestamptz,
  "atb" timestamptz,
  "atd" timestamptz,
  "status" "maritime"."port_call_status" NOT NULL DEFAULT 'ANNOUNCED',
  "agent_id" text,
  "delay_reason" text,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "port_calls_org_id_idx" ON "maritime"."port_calls" ("org_id");
--> statement-breakpoint
CREATE INDEX "port_calls_org_eta_idx" ON "maritime"."port_calls" ("org_id", "eta");
--> statement-breakpoint
CREATE INDEX "port_calls_voyage_idx" ON "maritime"."port_calls" ("org_id", "voyage_id");
--> statement-breakpoint
CREATE INDEX "port_calls_status_idx" ON "maritime"."port_calls" ("org_id", "status");
--> statement-breakpoint

-- Berth Assignments (maritime)
CREATE TABLE "maritime"."berth_assignments" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "port_call_id" text NOT NULL REFERENCES "maritime"."port_calls"("id"),
  "berth_id" text NOT NULL,
  "planned_start" timestamptz NOT NULL,
  "planned_end" timestamptz NOT NULL,
  "actual_start" timestamptz,
  "actual_end" timestamptz,
  "status" "maritime"."berth_assignment_status" NOT NULL DEFAULT 'PLANNED',
  "assigned_by" text NOT NULL,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "maritime_berth_assignments_org_idx" ON "maritime"."berth_assignments" ("org_id");
--> statement-breakpoint
CREATE INDEX "maritime_berth_assignments_port_call_idx" ON "maritime"."berth_assignments" ("org_id", "port_call_id");
--> statement-breakpoint
CREATE INDEX "maritime_berth_assignments_status_idx" ON "maritime"."berth_assignments" ("org_id", "status");
--> statement-breakpoint

-- Pilot Assignments
CREATE TABLE "maritime"."pilot_assignments" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "port_call_id" text NOT NULL REFERENCES "maritime"."port_calls"("id"),
  "pilot_id" text,
  "type" "maritime"."pilot_assignment_type" NOT NULL,
  "scheduled_at" timestamptz NOT NULL,
  "actual_at" timestamptz,
  "status" "maritime"."pilot_assignment_status" NOT NULL DEFAULT 'SCHEDULED',
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "pilot_assignments_org_idx" ON "maritime"."pilot_assignments" ("org_id");
--> statement-breakpoint
CREATE INDEX "pilot_assignments_port_call_idx" ON "maritime"."pilot_assignments" ("port_call_id");
--> statement-breakpoint

-- Tug Assignments
CREATE TABLE "maritime"."tug_assignments" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "port_call_id" text NOT NULL REFERENCES "maritime"."port_calls"("id"),
  "tug_asset_id" text,
  "type" "maritime"."pilot_assignment_type" NOT NULL,
  "scheduled_at" timestamptz NOT NULL,
  "actual_at" timestamptz,
  "status" "maritime"."pilot_assignment_status" NOT NULL DEFAULT 'SCHEDULED',
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "tug_assignments_org_idx" ON "maritime"."tug_assignments" ("org_id");
--> statement-breakpoint
CREATE INDEX "tug_assignments_port_call_idx" ON "maritime"."tug_assignments" ("port_call_id");
--> statement-breakpoint

-- Vessel Positions (AIS — high volume, no org_id — RLS via vessels)
CREATE TABLE "maritime"."vessel_positions" (
  "id" text PRIMARY KEY NOT NULL,
  "vessel_id" text NOT NULL REFERENCES "maritime"."vessels"("id"),
  "position" geometry(Point, 4326) NOT NULL,
  "speed" numeric,
  "heading" numeric,
  "recorded_at" timestamptz NOT NULL
);
--> statement-breakpoint
CREATE INDEX "vessel_positions_vessel_time_idx" ON "maritime"."vessel_positions" ("vessel_id", "recorded_at" DESC);
--> statement-breakpoint
CREATE INDEX "vessel_positions_geom_idx" ON "maritime"."vessel_positions" USING GIST ("position");
--> statement-breakpoint

-- RLS
ALTER TABLE "maritime"."vessels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maritime"."voyages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maritime"."port_calls" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maritime"."berth_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maritime"."pilot_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maritime"."tug_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maritime"."vessel_positions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "maritime_vessels_rls" ON "maritime"."vessels"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "maritime_voyages_rls" ON "maritime"."voyages"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "maritime_port_calls_rls" ON "maritime"."port_calls"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "maritime_berth_assignments_rls" ON "maritime"."berth_assignments"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "maritime_pilot_assignments_rls" ON "maritime"."pilot_assignments"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "maritime_tug_assignments_rls" ON "maritime"."tug_assignments"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint

-- vessel_positions RLS via parent vessels table (no org_id column)
CREATE POLICY "maritime_vessel_positions_rls" ON "maritime"."vessel_positions"
  USING (
    EXISTS (
      SELECT 1 FROM "maritime"."vessels" v
      WHERE v.id = vessel_id
        AND v.org_id = current_setting('app.current_org_id', true)
    )
  );
