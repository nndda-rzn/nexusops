-- Phase 3 Step 4: Warehouse domain schema
-- warehouses, receivings, inventory, pickings, dispatches, cycle_counts

CREATE SCHEMA IF NOT EXISTS "warehouse";
--> statement-breakpoint

-- Enums
CREATE TYPE "warehouse"."warehouse_type" AS ENUM('GENERAL', 'BONDED', 'COLD_CHAIN', 'HAZMAT', 'CONSOLIDATION');
--> statement-breakpoint
CREATE TYPE "warehouse"."receiving_status" AS ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DISCREPANCY');
--> statement-breakpoint
CREATE TYPE "warehouse"."inventory_condition" AS ENUM('GOOD', 'DAMAGED', 'QUARANTINE');
--> statement-breakpoint
CREATE TYPE "warehouse"."picking_status" AS ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
--> statement-breakpoint
CREATE TYPE "warehouse"."cycle_count_type" AS ENUM('FULL', 'PARTIAL', 'SPOT');
--> statement-breakpoint
CREATE TYPE "warehouse"."cycle_count_status" AS ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
--> statement-breakpoint

-- Warehouses
CREATE TABLE "warehouse"."warehouses" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "location" geometry(Point, 4326),
  "boundary" geometry(Polygon, 4326),
  "type" "warehouse"."warehouse_type" NOT NULL,
  "total_area_m2" numeric,
  "usable_area_m2" numeric,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "warehouses_org_idx" ON "warehouse"."warehouses" ("org_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "warehouses_org_code_unique" ON "warehouse"."warehouses" ("org_id", "code");
--> statement-breakpoint

-- Receivings
CREATE TABLE "warehouse"."receivings" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "warehouse_id" text NOT NULL REFERENCES "warehouse"."warehouses"("id"),
  "shipment_id" text,
  "reference_number" text NOT NULL,
  "received_at" timestamptz,
  "received_by" text,
  "status" "warehouse"."receiving_status" NOT NULL DEFAULT 'PENDING',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "receivings_org_idx" ON "warehouse"."receivings" ("org_id");
--> statement-breakpoint
CREATE INDEX "receivings_warehouse_idx" ON "warehouse"."receivings" ("org_id", "warehouse_id");
--> statement-breakpoint
CREATE INDEX "receivings_status_idx" ON "warehouse"."receivings" ("org_id", "status");
--> statement-breakpoint

-- Inventory
CREATE TABLE "warehouse"."inventory" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "warehouse_id" text NOT NULL REFERENCES "warehouse"."warehouses"("id"),
  "sku" text NOT NULL,
  "description" text,
  "quantity_on_hand" numeric NOT NULL DEFAULT 0,
  "quantity_reserved" numeric NOT NULL DEFAULT 0,
  "location_id" text,
  "batch_number" text,
  "expiry_date" date,
  "condition" "warehouse"."inventory_condition" NOT NULL DEFAULT 'GOOD',
  "last_counted_at" timestamptz,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "inventory_org_idx" ON "warehouse"."inventory" ("org_id");
--> statement-breakpoint
CREATE INDEX "inventory_warehouse_idx" ON "warehouse"."inventory" ("org_id", "warehouse_id");
--> statement-breakpoint
CREATE INDEX "inventory_sku_idx" ON "warehouse"."inventory" ("org_id", "sku");
--> statement-breakpoint

-- Pickings
CREATE TABLE "warehouse"."pickings" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "warehouse_id" text NOT NULL REFERENCES "warehouse"."warehouses"("id"),
  "order_id" text,
  "picker_id" text,
  "started_at" timestamptz,
  "completed_at" timestamptz,
  "status" "warehouse"."picking_status" NOT NULL DEFAULT 'PENDING',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "pickings_org_idx" ON "warehouse"."pickings" ("org_id");
--> statement-breakpoint
CREATE INDEX "pickings_warehouse_idx" ON "warehouse"."pickings" ("org_id", "warehouse_id");
--> statement-breakpoint
CREATE INDEX "pickings_status_idx" ON "warehouse"."pickings" ("org_id", "status");
--> statement-breakpoint

-- Dispatches
CREATE TABLE "warehouse"."dispatches" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "warehouse_id" text NOT NULL REFERENCES "warehouse"."warehouses"("id"),
  "shipment_id" text,
  "trip_id" text,
  "dispatched_at" timestamptz NOT NULL,
  "dispatched_by" text,
  "vehicle_id" text,
  "driver_id" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "dispatches_org_idx" ON "warehouse"."dispatches" ("org_id");
--> statement-breakpoint
CREATE INDEX "dispatches_warehouse_idx" ON "warehouse"."dispatches" ("org_id", "warehouse_id");
--> statement-breakpoint

-- Cycle Counts
CREATE TABLE "warehouse"."cycle_counts" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "warehouse_id" text NOT NULL REFERENCES "warehouse"."warehouses"("id"),
  "count_type" "warehouse"."cycle_count_type" NOT NULL,
  "scheduled_at" timestamptz,
  "completed_at" timestamptz,
  "conducted_by" text,
  "items_counted" integer,
  "discrepancies_found" integer,
  "status" "warehouse"."cycle_count_status" NOT NULL DEFAULT 'SCHEDULED',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "cycle_counts_org_idx" ON "warehouse"."cycle_counts" ("org_id");
--> statement-breakpoint
CREATE INDEX "cycle_counts_warehouse_idx" ON "warehouse"."cycle_counts" ("org_id", "warehouse_id");
--> statement-breakpoint
CREATE INDEX "cycle_counts_status_idx" ON "warehouse"."cycle_counts" ("org_id", "status");
--> statement-breakpoint

-- RLS
ALTER TABLE "warehouse"."warehouses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "warehouse"."receivings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "warehouse"."inventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "warehouse"."pickings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "warehouse"."dispatches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "warehouse"."cycle_counts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "warehouse_warehouses_rls" ON "warehouse"."warehouses"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "warehouse_receivings_rls" ON "warehouse"."receivings"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "warehouse_inventory_rls" ON "warehouse"."inventory"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "warehouse_pickings_rls" ON "warehouse"."pickings"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "warehouse_dispatches_rls" ON "warehouse"."dispatches"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "warehouse_cycle_counts_rls" ON "warehouse"."cycle_counts"
  USING (org_id = current_setting('app.current_org_id', true));
