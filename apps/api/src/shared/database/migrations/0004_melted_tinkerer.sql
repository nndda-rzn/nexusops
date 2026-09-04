CREATE SCHEMA "containers";
--> statement-breakpoint
CREATE TYPE "public"."container_size" AS ENUM('20FT', '40FT', '40FT_HC', '45FT');--> statement-breakpoint
CREATE TYPE "public"."container_status" AS ENUM('ANNOUNCED', 'ON_VESSEL', 'DISCHARGED', 'IN_TRANSFER', 'IN_YARD', 'RELEASED', 'GATE_OUT', 'CUSTOMS_HOLD', 'DAMAGED', 'INSPECTION', 'TRANSSHIPMENT');--> statement-breakpoint
CREATE TYPE "public"."container_type" AS ENUM('DRY', 'REEFER', 'OPEN_TOP', 'FLAT_RACK', 'TANK');--> statement-breakpoint
CREATE TYPE "public"."hold_status" AS ENUM('ACTIVE', 'RELEASED');--> statement-breakpoint
CREATE TYPE "public"."hold_type" AS ENUM('CUSTOMS_HOLD', 'PAYMENT_HOLD', 'DAMAGE_HOLD', 'INSPECTION_HOLD');--> statement-breakpoint
CREATE TYPE "public"."movement_type" AS ENUM('DISCHARGE', 'LOAD', 'YARD_MOVE', 'GATE_IN', 'GATE_OUT', 'RESHUFFLE');--> statement-breakpoint
CREATE TABLE "containers"."holds" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"container_id" text NOT NULL,
	"hold_type" "hold_type" NOT NULL,
	"reason" text NOT NULL,
	"notes" text,
	"placed_by" text NOT NULL,
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_by" text,
	"released_at" timestamp with time zone,
	"status" "hold_status" DEFAULT 'ACTIVE' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "containers"."inspections" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"container_id" text NOT NULL,
	"inspection_type" text NOT NULL,
	"result" text NOT NULL,
	"findings" text,
	"photo_ids" text[],
	"inspected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"inspector_id" text NOT NULL,
	"next_inspection_date" timestamp with time zone,
	"work_order_id" text
);
--> statement-breakpoint
CREATE TABLE "containers"."movements" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"container_id" text NOT NULL,
	"movement_type" "movement_type" NOT NULL,
	"from_location_type" text,
	"from_location_id" text,
	"to_location_type" text NOT NULL,
	"to_location_id" text NOT NULL,
	"equipment_id" text,
	"operator_id" text,
	"moved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"is_exception" boolean DEFAULT false NOT NULL,
	"verified_by" text
);
--> statement-breakpoint
CREATE TABLE "containers"."units" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"container_number" text NOT NULL,
	"type" "container_type" NOT NULL,
	"size" "container_size" NOT NULL,
	"status" "container_status" DEFAULT 'ANNOUNCED' NOT NULL,
	"current_location_id" text,
	"current_location_type" text,
	"shipment_id" text,
	"vessel_id" text,
	"tare_weight" numeric,
	"max_payload" numeric,
	"seal_number" text,
	"is_hazmat" boolean DEFAULT false NOT NULL,
	"hazmat_class" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "holds_container_idx" ON "containers"."holds" USING btree ("org_id","container_id");--> statement-breakpoint
CREATE INDEX "holds_status_idx" ON "containers"."holds" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "inspections_container_idx" ON "containers"."inspections" USING btree ("org_id","container_id");--> statement-breakpoint
CREATE INDEX "movements_container_idx" ON "containers"."movements" USING btree ("org_id","container_id");--> statement-breakpoint
CREATE INDEX "movements_moved_at_idx" ON "containers"."movements" USING btree ("org_id","moved_at");--> statement-breakpoint
CREATE INDEX "containers_org_id_idx" ON "containers"."units" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "containers_org_status_idx" ON "containers"."units" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "containers_shipment_idx" ON "containers"."units" USING btree ("org_id","shipment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "containers_number_org_unique" ON "containers"."units" USING btree ("org_id","container_number");