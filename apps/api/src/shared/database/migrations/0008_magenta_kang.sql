CREATE SCHEMA "intermodal";
--> statement-breakpoint
CREATE TYPE "public"."coordination_status" AS ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."coordination_type" AS ENUM('RESOURCE_REQUEST', 'SCHEDULE_SYNC', 'CAPACITY_CHECK', 'EMERGENCY');--> statement-breakpoint
CREATE TYPE "public"."handover_status" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."transfer_status" AS ENUM('PENDING', 'APPROVED', 'SETTLED', 'DISPUTED');--> statement-breakpoint
CREATE TABLE "intermodal"."coordinations" (
	"id" text PRIMARY KEY NOT NULL,
	"initiator_org_id" text NOT NULL,
	"target_org_id" text NOT NULL,
	"coordination_type" "coordination_type" NOT NULL,
	"reference_type" text,
	"reference_id" text,
	"message" text NOT NULL,
	"status" "coordination_status" DEFAULT 'OPEN' NOT NULL,
	"resolved_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "intermodal"."handover_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"shipment_id" text NOT NULL,
	"leg_id" text NOT NULL,
	"next_leg_id" text,
	"from_entity_id" text NOT NULL,
	"to_entity_id" text NOT NULL,
	"cargo_details" jsonb,
	"handover_location" text,
	"handover_location_type" text,
	"status" "handover_status" DEFAULT 'PENDING' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"rejection_reason" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intermodal"."internal_transfers" (
	"id" text PRIMARY KEY NOT NULL,
	"holding_org_id" text NOT NULL,
	"from_entity_id" text NOT NULL,
	"to_entity_id" text NOT NULL,
	"reference_type" text NOT NULL,
	"reference_id" text NOT NULL,
	"description" text,
	"amount" text NOT NULL,
	"currency" text DEFAULT 'IDR' NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"status" "transfer_status" DEFAULT 'PENDING' NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"settled_at" timestamp with time zone,
	"dispute_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "coordinations_initiator_idx" ON "intermodal"."coordinations" USING btree ("initiator_org_id");--> statement-breakpoint
CREATE INDEX "coordinations_target_idx" ON "intermodal"."coordinations" USING btree ("target_org_id");--> statement-breakpoint
CREATE INDEX "coordinations_status_idx" ON "intermodal"."coordinations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "handovers_shipment_idx" ON "intermodal"."handover_requests" USING btree ("shipment_id");--> statement-breakpoint
CREATE INDEX "handovers_from_entity_idx" ON "intermodal"."handover_requests" USING btree ("from_entity_id");--> statement-breakpoint
CREATE INDEX "handovers_to_entity_idx" ON "intermodal"."handover_requests" USING btree ("to_entity_id");--> statement-breakpoint
CREATE INDEX "handovers_status_idx" ON "intermodal"."handover_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "transfers_holding_idx" ON "intermodal"."internal_transfers" USING btree ("holding_org_id");--> statement-breakpoint
CREATE INDEX "transfers_from_idx" ON "intermodal"."internal_transfers" USING btree ("from_entity_id");--> statement-breakpoint
CREATE INDEX "transfers_status_idx" ON "intermodal"."internal_transfers" USING btree ("status");