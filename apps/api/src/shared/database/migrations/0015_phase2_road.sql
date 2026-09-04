-- Phase 2 Step 3: Road domain schema
-- Vehicles, drivers, routes, trips, checkpoints, vehicle positions (GPS)

CREATE SCHEMA IF NOT EXISTS "road";
--> statement-breakpoint

-- Enums
CREATE TYPE "road"."vehicle_type" AS ENUM('TRUCK', 'TRAILER', 'PICKUP', 'VAN');
--> statement-breakpoint
CREATE TYPE "road"."vehicle_status" AS ENUM('AVAILABLE', 'ON_TRIP', 'MAINTENANCE', 'OFFLINE');
--> statement-breakpoint
CREATE TYPE "road"."driver_status" AS ENUM('AVAILABLE', 'ON_DUTY', 'OFF_DUTY', 'LEAVE');
--> statement-breakpoint
CREATE TYPE "road"."trip_status" AS ENUM(
  'PLANNED', 'ASSIGNED', 'DISPATCHED', 'EN_ROUTE',
  'AT_CHECKPOINT', 'ARRIVED_DESTINATION', 'DELIVERING',
  'COMPLETED', 'DELAYED', 'BREAKDOWN', 'CANCELLED'
);
--> statement-breakpoint
CREATE TYPE "road"."checkpoint_type" AS ENUM('GATE_OUT', 'WEIGH_BRIDGE', 'TOLL', 'DELIVERY_POINT');
--> statement-breakpoint
CREATE TYPE "road"."route_type" AS ENUM('HIGHWAY', 'PROVINCIAL', 'LOCAL', 'TOLL');
--> statement-breakpoint

-- Vehicles
CREATE TABLE "road"."vehicles" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "asset_id" text,
  "plate_number" text NOT NULL,
  "type" "road"."vehicle_type" NOT NULL,
  "brand" text,
  "model" text,
  "year" integer,
  "capacity_weight" numeric,
  "capacity_volume" numeric,
  "container_capable" boolean NOT NULL DEFAULT false,
  "container_sizes" text,
  "has_reefer" boolean NOT NULL DEFAULT false,
  "status" "road"."vehicle_status" NOT NULL DEFAULT 'AVAILABLE',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "vehicles_org_id_idx" ON "road"."vehicles" ("org_id");
--> statement-breakpoint
CREATE INDEX "vehicles_org_status_idx" ON "road"."vehicles" ("org_id", "status");
--> statement-breakpoint
CREATE UNIQUE INDEX "vehicles_org_plate_unique" ON "road"."vehicles" ("org_id", "plate_number");
--> statement-breakpoint

-- Drivers
CREATE TABLE "road"."drivers" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "employee_id" text,
  "license_number" text NOT NULL,
  "license_type" text NOT NULL,
  "license_expiry" timestamptz NOT NULL,
  "status" "road"."driver_status" NOT NULL DEFAULT 'AVAILABLE',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "drivers_org_id_idx" ON "road"."drivers" ("org_id");
--> statement-breakpoint
CREATE INDEX "drivers_org_status_idx" ON "road"."drivers" ("org_id", "status");
--> statement-breakpoint

-- Routes
CREATE TABLE "road"."routes" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "origin" geometry(Point, 4326),
  "destination" geometry(Point, 4326),
  "geometry" geometry(LineString, 4326),
  "distance_km" numeric NOT NULL,
  "estimated_duration_minutes" integer NOT NULL,
  "toll_cost" numeric,
  "route_type" "road"."route_type" NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "routes_org_idx" ON "road"."routes" ("org_id");
--> statement-breakpoint

-- Trips
CREATE TABLE "road"."trips" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "reference_number" text NOT NULL,
  "vehicle_id" text REFERENCES "road"."vehicles"("id"),
  "driver_id" text REFERENCES "road"."drivers"("id"),
  "shipment_id" text,
  "container_id" text,
  "origin" text NOT NULL,
  "destination" text NOT NULL,
  "route_id" text REFERENCES "road"."routes"("id"),
  "scheduled_departure" timestamptz,
  "scheduled_arrival" timestamptz,
  "actual_departure" timestamptz,
  "actual_arrival" timestamptz,
  "status" "road"."trip_status" NOT NULL DEFAULT 'PLANNED',
  "delay_minutes" integer NOT NULL DEFAULT 0,
  "dispatcher_id" text,
  "notes" text,
  "cancellation_reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "trips_org_status_idx" ON "road"."trips" ("org_id", "status");
--> statement-breakpoint
CREATE INDEX "trips_vehicle_idx" ON "road"."trips" ("vehicle_id");
--> statement-breakpoint
CREATE INDEX "trips_driver_idx" ON "road"."trips" ("driver_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "trips_org_ref_unique" ON "road"."trips" ("org_id", "reference_number");
--> statement-breakpoint

-- Checkpoints
CREATE TABLE "road"."checkpoints" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "trip_id" text NOT NULL REFERENCES "road"."trips"("id"),
  "location" geometry(Point, 4326),
  "checkpoint_type" "road"."checkpoint_type" NOT NULL,
  "scheduled_at" timestamptz,
  "actual_at" timestamptz,
  "status" text NOT NULL DEFAULT 'PENDING',
  "notes" text
);
--> statement-breakpoint
CREATE INDEX "checkpoints_org_idx" ON "road"."checkpoints" ("org_id");
--> statement-breakpoint
CREATE INDEX "checkpoints_trip_idx" ON "road"."checkpoints" ("trip_id");
--> statement-breakpoint

-- Vehicle Positions (GPS — high volume, no org_id — RLS via vehicles)
CREATE TABLE "road"."vehicle_positions" (
  "id" text PRIMARY KEY NOT NULL,
  "vehicle_id" text NOT NULL REFERENCES "road"."vehicles"("id"),
  "position" geometry(Point, 4326) NOT NULL,
  "speed" numeric,
  "heading" numeric,
  "recorded_at" timestamptz NOT NULL
);
--> statement-breakpoint
CREATE INDEX "vehicle_positions_vehicle_time_idx" ON "road"."vehicle_positions" ("vehicle_id", "recorded_at" DESC);
--> statement-breakpoint
CREATE INDEX "vehicle_positions_geom_idx" ON "road"."vehicle_positions" USING GIST ("position");
--> statement-breakpoint

-- RLS
ALTER TABLE "road"."vehicles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "road"."drivers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "road"."routes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "road"."trips" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "road"."checkpoints" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "road"."vehicle_positions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "road_vehicles_rls" ON "road"."vehicles"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "road_drivers_rls" ON "road"."drivers"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "road_routes_rls" ON "road"."routes"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "road_trips_rls" ON "road"."trips"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "road_checkpoints_rls" ON "road"."checkpoints"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint

-- vehicle_positions RLS via parent vehicles table
CREATE POLICY "road_vehicle_positions_rls" ON "road"."vehicle_positions"
  USING (
    EXISTS (
      SELECT 1 FROM "road"."vehicles" v
      WHERE v.id = vehicle_id
        AND v.org_id = current_setting('app.current_org_id', true)
    )
  );
