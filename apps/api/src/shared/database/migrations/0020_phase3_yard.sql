-- Phase 3 Step 3: Yard domain schema
-- yards, blocks, slots, movements

CREATE SCHEMA IF NOT EXISTS "yard";
--> statement-breakpoint

-- Enums
CREATE TYPE "yard"."yard_type" AS ENUM('IMPORT', 'EXPORT', 'TRANSSHIP', 'REEFER', 'HAZMAT', 'EMPTY');
--> statement-breakpoint
CREATE TYPE "yard"."block_type" AS ENUM('IMPORT', 'EXPORT', 'REEFER', 'EMPTY', 'HAZMAT');
--> statement-breakpoint
CREATE TYPE "yard"."equipment_type" AS ENUM('RTG', 'RMG', 'STRADDLE');
--> statement-breakpoint
CREATE TYPE "yard"."slot_status" AS ENUM('EMPTY', 'OCCUPIED', 'RESERVED', 'BLOCKED');
--> statement-breakpoint
CREATE TYPE "yard"."yard_movement_type" AS ENUM('INBOUND', 'OUTBOUND', 'RESHUFFLE', 'SHIFT');
--> statement-breakpoint

-- Yards
CREATE TABLE "yard"."yards" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "terminal_id" text NOT NULL,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "boundary" geometry(Polygon, 4326),
  "total_capacity_teu" integer,
  "type" "yard"."yard_type" NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "yards_org_idx" ON "yard"."yards" ("org_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "yards_org_code_unique" ON "yard"."yards" ("org_id", "code");
--> statement-breakpoint

-- Blocks
CREATE TABLE "yard"."blocks" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "yard_id" text NOT NULL REFERENCES "yard"."yards"("id"),
  "code" text NOT NULL,
  "block_type" "yard"."block_type" NOT NULL,
  "bay_count" integer NOT NULL,
  "row_count" integer NOT NULL,
  "max_tier" integer NOT NULL DEFAULT 5,
  "equipment_type" "yard"."equipment_type",
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "blocks_org_idx" ON "yard"."blocks" ("org_id");
--> statement-breakpoint
CREATE INDEX "blocks_yard_idx" ON "yard"."blocks" ("yard_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "blocks_yard_code_unique" ON "yard"."blocks" ("yard_id", "code");
--> statement-breakpoint

-- Slots
CREATE TABLE "yard"."slots" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "block_id" text NOT NULL REFERENCES "yard"."blocks"("id"),
  "bay" text NOT NULL,
  "row" text NOT NULL,
  "tier" integer NOT NULL,
  "status" "yard"."slot_status" NOT NULL DEFAULT 'EMPTY',
  "container_id" text,
  "reserved_for" text,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "slots_org_idx" ON "yard"."slots" ("org_id");
--> statement-breakpoint
CREATE INDEX "slots_block_idx" ON "yard"."slots" ("block_id");
--> statement-breakpoint
CREATE INDEX "slots_status_idx" ON "yard"."slots" ("org_id", "status");
--> statement-breakpoint
CREATE UNIQUE INDEX "slots_block_position_unique" ON "yard"."slots" ("block_id", "bay", "row", "tier");
--> statement-breakpoint

-- Yard Movements
CREATE TABLE "yard"."movements" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "container_id" text NOT NULL,
  "from_slot_id" text,
  "to_slot_id" text NOT NULL REFERENCES "yard"."slots"("id"),
  "movement_type" "yard"."yard_movement_type" NOT NULL,
  "equipment_id" text,
  "operator_id" text,
  "moved_at" timestamptz NOT NULL
);
--> statement-breakpoint
CREATE INDEX "yard_movements_org_idx" ON "yard"."movements" ("org_id");
--> statement-breakpoint
CREATE INDEX "yard_movements_container_idx" ON "yard"."movements" ("container_id");
--> statement-breakpoint
CREATE INDEX "yard_movements_time_idx" ON "yard"."movements" ("org_id", "moved_at");
--> statement-breakpoint

-- RLS
ALTER TABLE "yard"."yards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "yard"."blocks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "yard"."slots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "yard"."movements" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "yard_yards_rls" ON "yard"."yards"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "yard_blocks_rls" ON "yard"."blocks"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "yard_slots_rls" ON "yard"."slots"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "yard_movements_rls" ON "yard"."movements"
  USING (org_id = current_setting('app.current_org_id', true));
