CREATE SCHEMA "shipments";
--> statement-breakpoint
CREATE TYPE "public"."exception_status" AS ENUM('OPEN', 'RESOLVED');--> statement-breakpoint
CREATE TYPE "public"."leg_mode" AS ENUM('SEA', 'RAIL', 'ROAD', 'AIR');--> statement-breakpoint
CREATE TYPE "public"."leg_status" AS ENUM('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DELAYED');--> statement-breakpoint
CREATE TYPE "public"."shipment_status" AS ENUM('DRAFT', 'BOOKED', 'IN_TRANSIT', 'AT_TERMINAL', 'CUSTOMS_CLEARANCE', 'DELIVERED', 'COMPLETED', 'ON_HOLD', 'DELAYED', 'DAMAGED', 'LOST', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."shipment_type" AS ENUM('GROUP', 'ENTITY');--> statement-breakpoint
CREATE TABLE "shipments"."exceptions" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"shipment_id" text NOT NULL,
	"leg_id" text,
	"exception_type" text NOT NULL,
	"description" text NOT NULL,
	"status" "exception_status" DEFAULT 'OPEN' NOT NULL,
	"raised_by" text NOT NULL,
	"raised_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipments"."shipment_legs" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"shipment_id" text NOT NULL,
	"sequence_number" text NOT NULL,
	"mode" "leg_mode" NOT NULL,
	"carrier_org_id" text,
	"owner_org_id" text NOT NULL,
	"origin" text NOT NULL,
	"destination" text NOT NULL,
	"scheduled_departure" timestamp with time zone,
	"scheduled_arrival" timestamp with time zone,
	"actual_departure" timestamp with time zone,
	"actual_arrival" timestamp with time zone,
	"delay_minutes" text DEFAULT '0' NOT NULL,
	"status" "leg_status" DEFAULT 'PLANNED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipments"."manifests" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"shipment_id" text NOT NULL,
	"document_type" text NOT NULL,
	"file_id" text NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"issued_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipments"."milestones" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"shipment_id" text NOT NULL,
	"leg_id" text,
	"milestone_type" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"location" text,
	"recorded_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipments"."shipments" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"shipment_type" "shipment_type" DEFAULT 'ENTITY' NOT NULL,
	"reference_number" text NOT NULL,
	"status" "shipment_status" DEFAULT 'DRAFT' NOT NULL,
	"origin" text NOT NULL,
	"destination" text NOT NULL,
	"cargo_type" text,
	"total_weight" numeric,
	"total_volume" numeric,
	"customer_id" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "exceptions_shipment_idx" ON "shipments"."exceptions" USING btree ("org_id","shipment_id");--> statement-breakpoint
CREATE INDEX "exceptions_status_idx" ON "shipments"."exceptions" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "legs_shipment_idx" ON "shipments"."shipment_legs" USING btree ("org_id","shipment_id");--> statement-breakpoint
CREATE INDEX "legs_status_idx" ON "shipments"."shipment_legs" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "manifests_shipment_idx" ON "shipments"."manifests" USING btree ("org_id","shipment_id");--> statement-breakpoint
CREATE INDEX "milestones_shipment_idx" ON "shipments"."milestones" USING btree ("org_id","shipment_id");--> statement-breakpoint
CREATE INDEX "shipments_org_id_idx" ON "shipments"."shipments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "shipments_org_status_idx" ON "shipments"."shipments" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "shipments_customer_idx" ON "shipments"."shipments" USING btree ("org_id","customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shipments_org_ref_unique" ON "shipments"."shipments" USING btree ("org_id","reference_number");