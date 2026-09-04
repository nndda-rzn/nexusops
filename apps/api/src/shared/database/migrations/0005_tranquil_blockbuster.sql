CREATE SCHEMA "terminal";
--> statement-breakpoint
CREATE TYPE "public"."berth_assignment_status" AS ENUM('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."berth_status" AS ENUM('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED');--> statement-breakpoint
CREATE TYPE "public"."crane_status" AS ENUM('AVAILABLE', 'OPERATING', 'MAINTENANCE', 'BREAKDOWN');--> statement-breakpoint
CREATE TYPE "public"."crane_type" AS ENUM('STS', 'RTG', 'RMG', 'MOBILE', 'FORKLIFT');--> statement-breakpoint
CREATE TYPE "public"."gate_status" AS ENUM('OPEN', 'CLOSED', 'RESTRICTED');--> statement-breakpoint
CREATE TYPE "public"."gate_type" AS ENUM('IN', 'OUT', 'INOUT');--> statement-breakpoint
CREATE TYPE "public"."terminal_type" AS ENUM('CONTAINER', 'BULK', 'LIQUID', 'RORO', 'MULTIPURPOSE');--> statement-breakpoint
CREATE TABLE "terminal"."berth_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"port_call_id" text NOT NULL,
	"berth_id" text NOT NULL,
	"planned_start" timestamp with time zone NOT NULL,
	"planned_end" timestamp with time zone NOT NULL,
	"actual_start" timestamp with time zone,
	"actual_end" timestamp with time zone,
	"status" "berth_assignment_status" DEFAULT 'PLANNED' NOT NULL,
	"assigned_by" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "terminal"."berths" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"terminal_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"length_m" numeric NOT NULL,
	"max_draft_m" numeric NOT NULL,
	"max_vessel_loa" numeric,
	"status" "berth_status" DEFAULT 'AVAILABLE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "terminal"."cranes" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"terminal_id" text NOT NULL,
	"asset_id" text,
	"code" text NOT NULL,
	"type" "crane_type" NOT NULL,
	"capacity_tonnes" numeric,
	"max_outreach_m" numeric,
	"status" "crane_status" DEFAULT 'AVAILABLE' NOT NULL,
	"current_berth_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "terminal"."gates" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"terminal_id" text NOT NULL,
	"gate_number" text NOT NULL,
	"type" "gate_type" NOT NULL,
	"lane_count" integer DEFAULT 1 NOT NULL,
	"status" "gate_status" DEFAULT 'CLOSED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "terminal"."terminals" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" "terminal_type" NOT NULL,
	"max_vessel_loa" numeric,
	"max_vessel_draft" numeric,
	"annual_capacity_teu" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "berth_assignments_org_idx" ON "terminal"."berth_assignments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "berth_assignments_berth_idx" ON "terminal"."berth_assignments" USING btree ("org_id","berth_id");--> statement-breakpoint
CREATE INDEX "berth_assignments_port_call_idx" ON "terminal"."berth_assignments" USING btree ("org_id","port_call_id");--> statement-breakpoint
CREATE INDEX "berth_assignments_status_idx" ON "terminal"."berth_assignments" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "berths_org_id_idx" ON "terminal"."berths" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "berths_terminal_idx" ON "terminal"."berths" USING btree ("org_id","terminal_id");--> statement-breakpoint
CREATE INDEX "berths_status_idx" ON "terminal"."berths" USING btree ("org_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "berths_org_code_unique" ON "terminal"."berths" USING btree ("org_id","code");--> statement-breakpoint
CREATE INDEX "cranes_org_id_idx" ON "terminal"."cranes" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "cranes_terminal_idx" ON "terminal"."cranes" USING btree ("org_id","terminal_id");--> statement-breakpoint
CREATE INDEX "cranes_status_idx" ON "terminal"."cranes" USING btree ("org_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "cranes_org_code_unique" ON "terminal"."cranes" USING btree ("org_id","code");--> statement-breakpoint
CREATE INDEX "gates_org_id_idx" ON "terminal"."gates" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "gates_terminal_idx" ON "terminal"."gates" USING btree ("org_id","terminal_id");--> statement-breakpoint
CREATE INDEX "terminals_org_id_idx" ON "terminal"."terminals" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "terminals_org_code_unique" ON "terminal"."terminals" USING btree ("org_id","code");