-- Phase 2: Enable PostGIS and create shared_master schema
-- PostGIS is required for geometry columns in maritime, rail, road, and shared_master domains.

-- ─────────────────────────────────────────
-- PostGIS Extensions
-- ─────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS postgis;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS postgis_topology;
--> statement-breakpoint

-- ─────────────────────────────────────────
-- Schema
-- ─────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS "shared_master";
--> statement-breakpoint

-- ─────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────
CREATE TYPE "shared_master"."port_type" AS ENUM('SEA', 'RIVER', 'INLAND');
--> statement-breakpoint
CREATE TYPE "shared_master"."master_status" AS ENUM('ACTIVE', 'INACTIVE');
--> statement-breakpoint
CREATE TYPE "shared_master"."terminal_type" AS ENUM('CONTAINER', 'BULK', 'LIQUID', 'RORO', 'MULTIPURPOSE');
--> statement-breakpoint
CREATE TYPE "shared_master"."station_type" AS ENUM('PORT', 'DRY_PORT', 'INLAND', 'JUNCTION', 'YARD');
--> statement-breakpoint
CREATE TYPE "shared_master"."road_segment_status" AS ENUM('ACTIVE', 'MAINTENANCE', 'CLOSED');
--> statement-breakpoint
CREATE TYPE "shared_master"."road_type" AS ENUM('TOLL', 'HIGHWAY', 'PROVINCIAL', 'LOCAL');
--> statement-breakpoint
CREATE TYPE "shared_master"."rail_segment_status" AS ENUM('ACTIVE', 'MAINTENANCE', 'CLOSED');
--> statement-breakpoint
CREATE TYPE "shared_master"."geofence_type" AS ENUM('TERMINAL', 'PORT', 'STATION', 'WAREHOUSE', 'AIRPORT', 'CUSTOM');
--> statement-breakpoint
CREATE TYPE "shared_master"."node_type" AS ENUM('PORT_GATE', 'WAREHOUSE', 'CHECKPOINT', 'JUNCTION', 'DESTINATION');
--> statement-breakpoint
CREATE TYPE "shared_master"."change_proposal_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');
--> statement-breakpoint
CREATE TYPE "shared_master"."change_type" AS ENUM('CREATE', 'UPDATE', 'DEACTIVATE');
--> statement-breakpoint

-- ─────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────

-- Ports
CREATE TABLE "shared_master"."ports" (
  "id" text PRIMARY KEY NOT NULL,
  "code" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "country" text NOT NULL,
  "city" text NOT NULL,
  "location" geometry(Point, 4326),
  "type" "shared_master"."port_type" NOT NULL,
  "status" "shared_master"."master_status" NOT NULL DEFAULT 'ACTIVE',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "ports_status_idx" ON "shared_master"."ports" ("status");
--> statement-breakpoint
CREATE INDEX "ports_type_idx" ON "shared_master"."ports" ("type");
--> statement-breakpoint

-- Terminals (shared master)
CREATE TABLE "shared_master"."terminals" (
  "id" text PRIMARY KEY NOT NULL,
  "port_id" text NOT NULL REFERENCES "shared_master"."ports"("id"),
  "code" text NOT NULL,
  "name" text NOT NULL,
  "operator_org_id" text,
  "boundary" geometry(Polygon, 4326),
  "type" "shared_master"."terminal_type" NOT NULL,
  "status" "shared_master"."master_status" NOT NULL DEFAULT 'ACTIVE',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "shared_terminals_port_idx" ON "shared_master"."terminals" ("port_id");
--> statement-breakpoint
CREATE INDEX "shared_terminals_status_idx" ON "shared_master"."terminals" ("status");
--> statement-breakpoint
CREATE UNIQUE INDEX "shared_terminals_code_unique" ON "shared_master"."terminals" ("port_id", "code");
--> statement-breakpoint

-- Stations
CREATE TABLE "shared_master"."stations" (
  "id" text PRIMARY KEY NOT NULL,
  "code" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "city" text NOT NULL,
  "location" geometry(Point, 4326),
  "type" "shared_master"."station_type" NOT NULL,
  "operator_org_id" text,
  "status" "shared_master"."master_status" NOT NULL DEFAULT 'ACTIVE',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "stations_status_idx" ON "shared_master"."stations" ("status");
--> statement-breakpoint
CREATE INDEX "stations_type_idx" ON "shared_master"."stations" ("type");
--> statement-breakpoint

-- Airports
CREATE TABLE "shared_master"."airports" (
  "id" text PRIMARY KEY NOT NULL,
  "iata_code" text NOT NULL UNIQUE,
  "icao_code" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "city" text NOT NULL,
  "country" text NOT NULL,
  "location" geometry(Point, 4326),
  "operator_org_id" text,
  "status" "shared_master"."master_status" NOT NULL DEFAULT 'ACTIVE',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "airports_status_idx" ON "shared_master"."airports" ("status");
--> statement-breakpoint

-- Road Nodes
CREATE TABLE "shared_master"."road_nodes" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text,
  "node_type" "shared_master"."node_type" NOT NULL,
  "location" geometry(Point, 4326) NOT NULL,
  "status" "shared_master"."master_status" NOT NULL DEFAULT 'ACTIVE'
);
--> statement-breakpoint
CREATE INDEX "road_nodes_type_idx" ON "shared_master"."road_nodes" ("node_type");
--> statement-breakpoint
CREATE INDEX "road_nodes_status_idx" ON "shared_master"."road_nodes" ("status");
--> statement-breakpoint

-- Road Segments
CREATE TABLE "shared_master"."road_segments" (
  "id" text PRIMARY KEY NOT NULL,
  "from_node_id" text NOT NULL REFERENCES "shared_master"."road_nodes"("id"),
  "to_node_id" text NOT NULL REFERENCES "shared_master"."road_nodes"("id"),
  "name" text,
  "road_type" "shared_master"."road_type" NOT NULL,
  "distance_km" numeric NOT NULL,
  "estimated_duration_minutes" integer NOT NULL,
  "geometry" geometry(LineString, 4326),
  "status" "shared_master"."road_segment_status" NOT NULL DEFAULT 'ACTIVE'
);
--> statement-breakpoint
CREATE INDEX "road_segments_from_idx" ON "shared_master"."road_segments" ("from_node_id");
--> statement-breakpoint
CREATE INDEX "road_segments_to_idx" ON "shared_master"."road_segments" ("to_node_id");
--> statement-breakpoint
CREATE INDEX "road_segments_status_idx" ON "shared_master"."road_segments" ("status");
--> statement-breakpoint

-- Rail Segments
CREATE TABLE "shared_master"."rail_segments" (
  "id" text PRIMARY KEY NOT NULL,
  "from_station_id" text NOT NULL REFERENCES "shared_master"."stations"("id"),
  "to_station_id" text NOT NULL REFERENCES "shared_master"."stations"("id"),
  "line_name" text NOT NULL,
  "length_km" numeric NOT NULL,
  "max_speed_kmh" integer NOT NULL,
  "geometry" geometry(LineString, 4326),
  "status" "shared_master"."rail_segment_status" NOT NULL DEFAULT 'ACTIVE'
);
--> statement-breakpoint
CREATE INDEX "rail_segments_from_idx" ON "shared_master"."rail_segments" ("from_station_id");
--> statement-breakpoint
CREATE INDEX "rail_segments_to_idx" ON "shared_master"."rail_segments" ("to_station_id");
--> statement-breakpoint
CREATE INDEX "rail_segments_status_idx" ON "shared_master"."rail_segments" ("status");
--> statement-breakpoint

-- Geofences
CREATE TABLE "shared_master"."geofences" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "geofence_type" "shared_master"."geofence_type" NOT NULL,
  "reference_id" text,
  "boundary" geometry(Polygon, 4326) NOT NULL,
  "status" "shared_master"."master_status" NOT NULL DEFAULT 'ACTIVE'
);
--> statement-breakpoint
CREATE INDEX "geofences_type_idx" ON "shared_master"."geofences" ("geofence_type");
--> statement-breakpoint
CREATE INDEX "geofences_ref_idx" ON "shared_master"."geofences" ("reference_id");
--> statement-breakpoint
CREATE INDEX "geofences_status_idx" ON "shared_master"."geofences" ("status");
--> statement-breakpoint

-- Commodity Types
CREATE TABLE "shared_master"."commodity_types" (
  "id" text PRIMARY KEY NOT NULL,
  "code" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "hs_code" text,
  "is_hazmat" boolean NOT NULL DEFAULT false,
  "is_reefer" boolean NOT NULL DEFAULT false,
  "is_oversized" boolean NOT NULL DEFAULT false,
  "handling_notes" text
);
--> statement-breakpoint
CREATE INDEX "commodity_types_hazmat_idx" ON "shared_master"."commodity_types" ("is_hazmat");
--> statement-breakpoint

-- Change Proposals
CREATE TABLE "shared_master"."change_proposals" (
  "id" text PRIMARY KEY NOT NULL,
  "table_name" text NOT NULL,
  "record_id" text,
  "change_type" "shared_master"."change_type" NOT NULL,
  "proposed_data" text NOT NULL,
  "reason" text NOT NULL,
  "proposed_by_org_id" text NOT NULL,
  "proposed_by_user_id" text NOT NULL,
  "status" "shared_master"."change_proposal_status" NOT NULL DEFAULT 'PENDING',
  "reviewed_by" text,
  "reviewed_at" timestamptz,
  "rejection_reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "change_proposals_status_idx" ON "shared_master"."change_proposals" ("status");
--> statement-breakpoint
CREATE INDEX "change_proposals_org_idx" ON "shared_master"."change_proposals" ("proposed_by_org_id");
--> statement-breakpoint

-- ─────────────────────────────────────────
-- RLS Policies
-- ─────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE "shared_master"."ports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shared_master"."terminals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shared_master"."stations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shared_master"."airports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shared_master"."road_nodes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shared_master"."road_segments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shared_master"."rail_segments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shared_master"."geofences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shared_master"."commodity_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shared_master"."change_proposals" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- READ: semua org dalam group bisa read
CREATE POLICY "shared_master_ports_read" ON "shared_master"."ports"
  AS PERMISSIVE FOR SELECT
  USING (current_setting('app.current_org_id', true) IS NOT NULL AND current_setting('app.current_org_id', true) != '');
--> statement-breakpoint
CREATE POLICY "shared_master_terminals_read" ON "shared_master"."terminals"
  AS PERMISSIVE FOR SELECT
  USING (current_setting('app.current_org_id', true) IS NOT NULL AND current_setting('app.current_org_id', true) != '');
--> statement-breakpoint
CREATE POLICY "shared_master_stations_read" ON "shared_master"."stations"
  AS PERMISSIVE FOR SELECT
  USING (current_setting('app.current_org_id', true) IS NOT NULL AND current_setting('app.current_org_id', true) != '');
--> statement-breakpoint
CREATE POLICY "shared_master_airports_read" ON "shared_master"."airports"
  AS PERMISSIVE FOR SELECT
  USING (current_setting('app.current_org_id', true) IS NOT NULL AND current_setting('app.current_org_id', true) != '');
--> statement-breakpoint
CREATE POLICY "shared_master_road_nodes_read" ON "shared_master"."road_nodes"
  AS PERMISSIVE FOR SELECT
  USING (current_setting('app.current_org_id', true) IS NOT NULL AND current_setting('app.current_org_id', true) != '');
--> statement-breakpoint
CREATE POLICY "shared_master_road_segments_read" ON "shared_master"."road_segments"
  AS PERMISSIVE FOR SELECT
  USING (current_setting('app.current_org_id', true) IS NOT NULL AND current_setting('app.current_org_id', true) != '');
--> statement-breakpoint
CREATE POLICY "shared_master_rail_segments_read" ON "shared_master"."rail_segments"
  AS PERMISSIVE FOR SELECT
  USING (current_setting('app.current_org_id', true) IS NOT NULL AND current_setting('app.current_org_id', true) != '');
--> statement-breakpoint
CREATE POLICY "shared_master_geofences_read" ON "shared_master"."geofences"
  AS PERMISSIVE FOR SELECT
  USING (current_setting('app.current_org_id', true) IS NOT NULL AND current_setting('app.current_org_id', true) != '');
--> statement-breakpoint
CREATE POLICY "shared_master_commodity_types_read" ON "shared_master"."commodity_types"
  AS PERMISSIVE FOR SELECT
  USING (current_setting('app.current_org_id', true) IS NOT NULL AND current_setting('app.current_org_id', true) != '');
--> statement-breakpoint
CREATE POLICY "shared_master_change_proposals_read" ON "shared_master"."change_proposals"
  AS PERMISSIVE FOR SELECT
  USING (current_setting('app.current_org_id', true) IS NOT NULL AND current_setting('app.current_org_id', true) != '');
--> statement-breakpoint

-- WRITE: hanya HOLDING yang bisa write
CREATE POLICY "shared_master_ports_write" ON "shared_master"."ports"
  AS PERMISSIVE FOR ALL
  USING (current_setting('app.entity_type', true) = 'HOLDING');
--> statement-breakpoint
CREATE POLICY "shared_master_terminals_write" ON "shared_master"."terminals"
  AS PERMISSIVE FOR ALL
  USING (current_setting('app.entity_type', true) = 'HOLDING');
--> statement-breakpoint
CREATE POLICY "shared_master_stations_write" ON "shared_master"."stations"
  AS PERMISSIVE FOR ALL
  USING (current_setting('app.entity_type', true) = 'HOLDING');
--> statement-breakpoint
CREATE POLICY "shared_master_airports_write" ON "shared_master"."airports"
  AS PERMISSIVE FOR ALL
  USING (current_setting('app.entity_type', true) = 'HOLDING');
--> statement-breakpoint
CREATE POLICY "shared_master_road_nodes_write" ON "shared_master"."road_nodes"
  AS PERMISSIVE FOR ALL
  USING (current_setting('app.entity_type', true) = 'HOLDING');
--> statement-breakpoint
CREATE POLICY "shared_master_road_segments_write" ON "shared_master"."road_segments"
  AS PERMISSIVE FOR ALL
  USING (current_setting('app.entity_type', true) = 'HOLDING');
--> statement-breakpoint
CREATE POLICY "shared_master_rail_segments_write" ON "shared_master"."rail_segments"
  AS PERMISSIVE FOR ALL
  USING (current_setting('app.entity_type', true) = 'HOLDING');
--> statement-breakpoint
CREATE POLICY "shared_master_geofences_write" ON "shared_master"."geofences"
  AS PERMISSIVE FOR ALL
  USING (current_setting('app.entity_type', true) = 'HOLDING');
--> statement-breakpoint
CREATE POLICY "shared_master_commodity_types_write" ON "shared_master"."commodity_types"
  AS PERMISSIVE FOR ALL
  USING (current_setting('app.entity_type', true) = 'HOLDING');
--> statement-breakpoint

-- Change proposals: semua org bisa INSERT (propose), Holding bisa UPDATE (review)
CREATE POLICY "shared_master_change_proposals_insert" ON "shared_master"."change_proposals"
  AS PERMISSIVE FOR INSERT
  WITH CHECK (current_setting('app.current_org_id', true) IS NOT NULL AND current_setting('app.current_org_id', true) != '');
--> statement-breakpoint
CREATE POLICY "shared_master_change_proposals_update" ON "shared_master"."change_proposals"
  AS PERMISSIVE FOR UPDATE
  USING (current_setting('app.entity_type', true) = 'HOLDING');
