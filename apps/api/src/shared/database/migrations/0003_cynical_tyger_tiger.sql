CREATE SCHEMA "operations";
--> statement-breakpoint
CREATE TYPE "public"."dependency_type" AS ENUM('FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH', 'START_TO_FINISH');--> statement-breakpoint
CREATE TYPE "public"."intervention_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'AUTO_APPROVED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."intervention_type" AS ENUM('RESCHEDULE', 'REALLOCATE', 'CANCEL', 'REPRIORITIZE', 'EMERGENCY_STOP');--> statement-breakpoint
CREATE TYPE "public"."operation_priority" AS ENUM('LOW', 'NORMAL', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."operation_status" AS ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DELAYED', 'ON_HOLD');--> statement-breakpoint
CREATE TYPE "public"."operation_type" AS ENUM('VESSEL_ARRIVAL', 'VESSEL_BERTHING', 'VESSEL_UNBERTHING', 'CONTAINER_DISCHARGE', 'CONTAINER_LOADING', 'YARD_MOVE', 'TRAIN_ARRIVAL', 'TRAIN_DEPARTURE', 'TRUCK_GATE_IN', 'TRUCK_GATE_OUT', 'WAREHOUSE_RECEIVING', 'WAREHOUSE_DISPATCH', 'FLIGHT_ARRIVAL', 'FLIGHT_DEPARTURE', 'CARGO_LOADING_AIR', 'MAINTENANCE', 'INSPECTION', 'INTERMODAL_HANDOVER');--> statement-breakpoint
CREATE TABLE "operations"."intervention_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"target_org_id" text NOT NULL,
	"operation_id" text NOT NULL,
	"intervention_type" "intervention_type" NOT NULL,
	"reason" text NOT NULL,
	"proposed_changes" jsonb NOT NULL,
	"status" "intervention_status" DEFAULT 'PENDING' NOT NULL,
	"requested_by" text NOT NULL,
	"responded_by" text,
	"responded_at" timestamp with time zone,
	"sla_deadline" timestamp with time zone NOT NULL,
	"escalated_to" text,
	"escalated_at" timestamp with time zone,
	"executed_at" timestamp with time zone,
	"execution_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operations"."operation_dependencies" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"operation_id" text NOT NULL,
	"depends_on_id" text NOT NULL,
	"depends_on_org_id" text NOT NULL,
	"dependency_type" "dependency_type" DEFAULT 'FINISH_TO_START' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operations"."operation_events" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"operation_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_id" text,
	"actor_type" text DEFAULT 'USER' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operations"."operation_resources" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"operation_id" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'ALLOCATED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operations"."operations" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"type" "operation_type" NOT NULL,
	"status" "operation_status" DEFAULT 'SCHEDULED' NOT NULL,
	"priority" "operation_priority" DEFAULT 'NORMAL' NOT NULL,
	"reference_id" text,
	"reference_type" text,
	"is_cross_entity" boolean DEFAULT false NOT NULL,
	"related_entity_ids" text[],
	"scheduled_start" timestamp with time zone,
	"scheduled_end" timestamp with time zone,
	"actual_start" timestamp with time zone,
	"actual_end" timestamp with time zone,
	"delay_minutes" integer DEFAULT 0 NOT NULL,
	"cancelled_by" text,
	"cancellation_reason" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "interventions_org_idx" ON "operations"."intervention_requests" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "interventions_target_org_idx" ON "operations"."intervention_requests" USING btree ("target_org_id");--> statement-breakpoint
CREATE INDEX "interventions_operation_idx" ON "operations"."intervention_requests" USING btree ("operation_id");--> statement-breakpoint
CREATE INDEX "interventions_status_idx" ON "operations"."intervention_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "interventions_sla_idx" ON "operations"."intervention_requests" USING btree ("sla_deadline");--> statement-breakpoint
CREATE INDEX "op_deps_operation_idx" ON "operations"."operation_dependencies" USING btree ("org_id","operation_id");--> statement-breakpoint
CREATE INDEX "op_deps_depends_on_idx" ON "operations"."operation_dependencies" USING btree ("depends_on_org_id","depends_on_id");--> statement-breakpoint
CREATE UNIQUE INDEX "op_deps_unique_idx" ON "operations"."operation_dependencies" USING btree ("operation_id","depends_on_id");--> statement-breakpoint
CREATE INDEX "op_events_operation_idx" ON "operations"."operation_events" USING btree ("org_id","operation_id");--> statement-breakpoint
CREATE INDEX "op_events_occurred_idx" ON "operations"."operation_events" USING btree ("org_id","occurred_at");--> statement-breakpoint
CREATE INDEX "op_resources_operation_idx" ON "operations"."operation_resources" USING btree ("org_id","operation_id");--> statement-breakpoint
CREATE INDEX "op_resources_resource_idx" ON "operations"."operation_resources" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "operations_org_id_idx" ON "operations"."operations" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "operations_org_status_idx" ON "operations"."operations" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "operations_org_type_idx" ON "operations"."operations" USING btree ("org_id","type");--> statement-breakpoint
CREATE INDEX "operations_org_scheduled_idx" ON "operations"."operations" USING btree ("org_id","scheduled_start");--> statement-breakpoint
CREATE INDEX "operations_reference_idx" ON "operations"."operations" USING btree ("org_id","reference_type","reference_id");