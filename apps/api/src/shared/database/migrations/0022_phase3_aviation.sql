-- Phase 3 Step 5: Aviation domain schema
-- aircraft, flights, airport_slots, airway_bills, cargo_manifests,
-- manifest_items, load_plans, load_plan_items, ground_handlings, crew_assignments

CREATE SCHEMA IF NOT EXISTS "aviation";
--> statement-breakpoint

-- Enums
CREATE TYPE "aviation"."aircraft_status" AS ENUM('ACTIVE', 'MAINTENANCE', 'AOG', 'RETIRED');
--> statement-breakpoint
CREATE TYPE "aviation"."flight_status" AS ENUM(
  'SCHEDULED', 'SLOT_CONFIRMED', 'CARGO_ACCEPTANCE', 'MANIFEST_CLOSED',
  'LOAD_PLANNED', 'LOADING', 'READY_FOR_DEPARTURE', 'DEPARTED',
  'ARRIVED', 'OFFLOADING', 'COMPLETED', 'DELAYED', 'DIVERTED', 'CANCELLED', 'AOG'
);
--> statement-breakpoint
CREATE TYPE "aviation"."slot_type" AS ENUM('DEPARTURE', 'ARRIVAL');
--> statement-breakpoint
CREATE TYPE "aviation"."slot_status" AS ENUM('REQUESTED', 'CONFIRMED', 'USED', 'CANCELLED');
--> statement-breakpoint
CREATE TYPE "aviation"."awb_status" AS ENUM('DRAFT', 'ISSUED', 'IN_TRANSIT', 'DELIVERED', 'VOID');
--> statement-breakpoint
CREATE TYPE "aviation"."manifest_status" AS ENUM('OPEN', 'CLOSED', 'SUBMITTED_CUSTOMS', 'CLEARED');
--> statement-breakpoint
CREATE TYPE "aviation"."load_plan_status" AS ENUM('DRAFT', 'APPROVED', 'EXECUTED');
--> statement-breakpoint
CREATE TYPE "aviation"."handling_type" AS ENUM('INBOUND', 'OUTBOUND', 'TRANSIT');
--> statement-breakpoint
CREATE TYPE "aviation"."handling_status" AS ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED');
--> statement-breakpoint
CREATE TYPE "aviation"."crew_role" AS ENUM('CAPTAIN', 'FIRST_OFFICER', 'LOADMASTER');
--> statement-breakpoint
CREATE TYPE "aviation"."crew_assignment_status" AS ENUM('ASSIGNED', 'CONFIRMED', 'COMPLETED', 'CANCELLED');
--> statement-breakpoint

-- Aircraft
CREATE TABLE "aviation"."aircraft" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "registration_number" text NOT NULL,
  "aircraft_type" text NOT NULL,
  "max_payload_kg" numeric,
  "max_volume_m3" numeric,
  "cargo_compartments" jsonb,
  "operator_org_id" text,
  "status" "aviation"."aircraft_status" NOT NULL DEFAULT 'ACTIVE',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "aircraft_org_idx" ON "aviation"."aircraft" ("org_id");
--> statement-breakpoint
CREATE INDEX "aircraft_status_idx" ON "aviation"."aircraft" ("org_id", "status");
--> statement-breakpoint
CREATE UNIQUE INDEX "aircraft_org_reg_unique" ON "aviation"."aircraft" ("org_id", "registration_number");
--> statement-breakpoint

-- Flights
CREATE TABLE "aviation"."flights" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "flight_number" text NOT NULL,
  "aircraft_id" text NOT NULL REFERENCES "aviation"."aircraft"("id"),
  "origin_airport_id" text,
  "destination_airport_id" text,
  "scheduled_departure" timestamptz NOT NULL,
  "scheduled_arrival" timestamptz NOT NULL,
  "actual_departure" timestamptz,
  "actual_arrival" timestamptz,
  "status" "aviation"."flight_status" NOT NULL DEFAULT 'SCHEDULED',
  "slot_id" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "flights_org_idx" ON "aviation"."flights" ("org_id");
--> statement-breakpoint
CREATE INDEX "flights_status_idx" ON "aviation"."flights" ("org_id", "status");
--> statement-breakpoint
CREATE INDEX "flights_departure_idx" ON "aviation"."flights" ("org_id", "scheduled_departure");
--> statement-breakpoint
CREATE UNIQUE INDEX "flights_org_number_unique" ON "aviation"."flights" ("org_id", "flight_number");
--> statement-breakpoint

-- Airport Slots
CREATE TABLE "aviation"."airport_slots" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "airport_id" text NOT NULL,
  "flight_id" text REFERENCES "aviation"."flights"("id"),
  "slot_type" "aviation"."slot_type" NOT NULL,
  "scheduled_time" timestamptz NOT NULL,
  "status" "aviation"."slot_status" NOT NULL DEFAULT 'REQUESTED',
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "airport_slots_org_idx" ON "aviation"."airport_slots" ("org_id");
--> statement-breakpoint
CREATE INDEX "airport_slots_flight_idx" ON "aviation"."airport_slots" ("flight_id");
--> statement-breakpoint

-- Airway Bills
CREATE TABLE "aviation"."airway_bills" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "awb_number" text NOT NULL,
  "flight_id" text REFERENCES "aviation"."flights"("id"),
  "shipper_id" text,
  "consignee_id" text,
  "origin_airport_id" text,
  "destination_airport_id" text,
  "commodity_type_id" text,
  "pieces" integer NOT NULL DEFAULT 0,
  "gross_weight_kg" numeric NOT NULL,
  "chargeable_weight_kg" numeric,
  "volume_m3" numeric,
  "is_dangerous_goods" boolean NOT NULL DEFAULT false,
  "dg_class" text,
  "status" "aviation"."awb_status" NOT NULL DEFAULT 'DRAFT',
  "document_id" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "airway_bills_org_idx" ON "aviation"."airway_bills" ("org_id");
--> statement-breakpoint
CREATE INDEX "airway_bills_flight_idx" ON "aviation"."airway_bills" ("flight_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "airway_bills_org_number_unique" ON "aviation"."airway_bills" ("org_id", "awb_number");
--> statement-breakpoint

-- Cargo Manifests
CREATE TABLE "aviation"."cargo_manifests" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "flight_id" text NOT NULL REFERENCES "aviation"."flights"("id"),
  "manifest_number" text NOT NULL,
  "total_pieces" integer NOT NULL DEFAULT 0,
  "total_weight_kg" numeric NOT NULL DEFAULT 0,
  "total_volume_m3" numeric,
  "status" "aviation"."manifest_status" NOT NULL DEFAULT 'OPEN',
  "closed_at" timestamptz,
  "document_id" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "cargo_manifests_org_idx" ON "aviation"."cargo_manifests" ("org_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "cargo_manifests_flight_unique" ON "aviation"."cargo_manifests" ("flight_id");
--> statement-breakpoint

-- Manifest Items
CREATE TABLE "aviation"."manifest_items" (
  "id" text PRIMARY KEY NOT NULL,
  "manifest_id" text NOT NULL REFERENCES "aviation"."cargo_manifests"("id"),
  "awb_id" text NOT NULL REFERENCES "aviation"."airway_bills"("id"),
  "pieces" integer NOT NULL,
  "weight_kg" numeric NOT NULL,
  "position_code" text
);
--> statement-breakpoint
CREATE INDEX "manifest_items_manifest_idx" ON "aviation"."manifest_items" ("manifest_id");
--> statement-breakpoint

-- Load Plans
CREATE TABLE "aviation"."load_plans" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "flight_id" text NOT NULL REFERENCES "aviation"."flights"("id"),
  "aircraft_id" text NOT NULL REFERENCES "aviation"."aircraft"("id"),
  "total_payload_kg" numeric,
  "cg_position" numeric,
  "status" "aviation"."load_plan_status" NOT NULL DEFAULT 'DRAFT',
  "approved_by" text,
  "approved_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "load_plans_org_idx" ON "aviation"."load_plans" ("org_id");
--> statement-breakpoint
CREATE INDEX "load_plans_flight_idx" ON "aviation"."load_plans" ("flight_id");
--> statement-breakpoint

-- Load Plan Items
CREATE TABLE "aviation"."load_plan_items" (
  "id" text PRIMARY KEY NOT NULL,
  "load_plan_id" text NOT NULL REFERENCES "aviation"."load_plans"("id"),
  "awb_id" text NOT NULL REFERENCES "aviation"."airway_bills"("id"),
  "compartment" text NOT NULL,
  "position" text,
  "weight_kg" numeric NOT NULL,
  "uld_number" text
);
--> statement-breakpoint
CREATE INDEX "load_plan_items_plan_idx" ON "aviation"."load_plan_items" ("load_plan_id");
--> statement-breakpoint

-- Ground Handlings
CREATE TABLE "aviation"."ground_handlings" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "flight_id" text NOT NULL REFERENCES "aviation"."flights"("id"),
  "airport_id" text NOT NULL,
  "handling_type" "aviation"."handling_type" NOT NULL,
  "handler_org_id" text,
  "scheduled_start" timestamptz,
  "scheduled_end" timestamptz,
  "actual_start" timestamptz,
  "actual_end" timestamptz,
  "status" "aviation"."handling_status" NOT NULL DEFAULT 'SCHEDULED',
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "ground_handlings_org_idx" ON "aviation"."ground_handlings" ("org_id");
--> statement-breakpoint
CREATE INDEX "ground_handlings_flight_idx" ON "aviation"."ground_handlings" ("flight_id");
--> statement-breakpoint

-- Crew Assignments
CREATE TABLE "aviation"."crew_assignments" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "flight_id" text NOT NULL REFERENCES "aviation"."flights"("id"),
  "employee_id" text,
  "role" "aviation"."crew_role" NOT NULL,
  "status" "aviation"."crew_assignment_status" NOT NULL DEFAULT 'ASSIGNED',
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "aviation_crew_assignments_org_idx" ON "aviation"."crew_assignments" ("org_id");
--> statement-breakpoint
CREATE INDEX "aviation_crew_assignments_flight_idx" ON "aviation"."crew_assignments" ("flight_id");
--> statement-breakpoint

-- RLS
ALTER TABLE "aviation"."aircraft" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "aviation"."flights" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "aviation"."airport_slots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "aviation"."airway_bills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "aviation"."cargo_manifests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "aviation"."manifest_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "aviation"."load_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "aviation"."load_plan_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "aviation"."ground_handlings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "aviation"."crew_assignments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "aviation_aircraft_rls" ON "aviation"."aircraft"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "aviation_flights_rls" ON "aviation"."flights"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "aviation_airport_slots_rls" ON "aviation"."airport_slots"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "aviation_airway_bills_rls" ON "aviation"."airway_bills"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "aviation_cargo_manifests_rls" ON "aviation"."cargo_manifests"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "aviation_manifest_items_rls" ON "aviation"."manifest_items"
  USING (EXISTS (
    SELECT 1 FROM "aviation"."cargo_manifests" m
    WHERE m.id = manifest_id AND m.org_id = current_setting('app.current_org_id', true)
  ));
--> statement-breakpoint
CREATE POLICY "aviation_load_plans_rls" ON "aviation"."load_plans"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "aviation_load_plan_items_rls" ON "aviation"."load_plan_items"
  USING (EXISTS (
    SELECT 1 FROM "aviation"."load_plans" lp
    WHERE lp.id = load_plan_id AND lp.org_id = current_setting('app.current_org_id', true)
  ));
--> statement-breakpoint
CREATE POLICY "aviation_ground_handlings_rls" ON "aviation"."ground_handlings"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "aviation_crew_assignments_rls" ON "aviation"."crew_assignments"
  USING (org_id = current_setting('app.current_org_id', true));
