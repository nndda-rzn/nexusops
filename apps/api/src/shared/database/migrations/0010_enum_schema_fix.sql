-- D-03 FIX: Move all domain enums from public schema to their respective domain schemas
-- pgEnum() in Drizzle creates enums in the public schema by default.
-- schema.enum() creates them in the correct schema.
-- This migration moves existing enums to the correct schemas.

-- ─────────────────────────────────────────
-- Operations enums: public → operations
-- ─────────────────────────────────────────
ALTER TYPE IF EXISTS "public"."operation_type" SET SCHEMA "operations";
--> statement-breakpoint
ALTER TYPE IF EXISTS "public"."operation_status" SET SCHEMA "operations";
--> statement-breakpoint
ALTER TYPE IF EXISTS "public"."operation_priority" SET SCHEMA "operations";
--> statement-breakpoint
ALTER TYPE IF EXISTS "public"."dependency_type" SET SCHEMA "operations";
--> statement-breakpoint
ALTER TYPE IF EXISTS "public"."intervention_type" SET SCHEMA "operations";
--> statement-breakpoint
ALTER TYPE IF EXISTS "public"."intervention_status" SET SCHEMA "operations";
--> statement-breakpoint

-- ─────────────────────────────────────────
-- Containers enums: public → containers
-- ─────────────────────────────────────────
ALTER TYPE IF EXISTS "public"."container_type" SET SCHEMA "containers";
--> statement-breakpoint
ALTER TYPE IF EXISTS "public"."container_size" SET SCHEMA "containers";
--> statement-breakpoint
ALTER TYPE IF EXISTS "public"."container_status" SET SCHEMA "containers";
--> statement-breakpoint
ALTER TYPE IF EXISTS "public"."movement_type" SET SCHEMA "containers";
--> statement-breakpoint
ALTER TYPE IF EXISTS "public"."hold_type" SET SCHEMA "containers";
--> statement-breakpoint
ALTER TYPE IF EXISTS "public"."hold_status" SET SCHEMA "containers";
--> statement-breakpoint

-- ─────────────────────────────────────────
-- Terminal enums: public → terminal
-- ─────────────────────────────────────────
ALTER TYPE IF EXISTS "public"."terminal_type" SET SCHEMA "terminal";
--> statement-breakpoint
ALTER TYPE IF EXISTS "public"."berth_status" SET SCHEMA "terminal";
--> statement-breakpoint
ALTER TYPE IF EXISTS "public"."gate_type" SET SCHEMA "terminal";
--> statement-breakpoint
ALTER TYPE IF EXISTS "public"."gate_status" SET SCHEMA "terminal";
--> statement-breakpoint
ALTER TYPE IF EXISTS "public"."crane_type" SET SCHEMA "terminal";
--> statement-breakpoint
ALTER TYPE IF EXISTS "public"."crane_status" SET SCHEMA "terminal";
--> statement-breakpoint
ALTER TYPE IF EXISTS "public"."berth_assignment_status" SET SCHEMA "terminal";
--> statement-breakpoint
ALTER TYPE IF EXISTS "public"."equipment_assignment_status" SET SCHEMA "terminal";
--> statement-breakpoint

-- ─────────────────────────────────────────
-- Shipments enums: public → shipments
-- ─────────────────────────────────────────
ALTER TYPE IF EXISTS "public"."shipment_type" SET SCHEMA "shipments";
--> statement-breakpoint
ALTER TYPE IF EXISTS "public"."shipment_status" SET SCHEMA "shipments";
--> statement-breakpoint
ALTER TYPE IF EXISTS "public"."leg_mode" SET SCHEMA "shipments";
--> statement-breakpoint
ALTER TYPE IF EXISTS "public"."leg_status" SET SCHEMA "shipments";
--> statement-breakpoint
ALTER TYPE IF EXISTS "public"."exception_status" SET SCHEMA "shipments";
--> statement-breakpoint

-- ─────────────────────────────────────────
-- Intermodal enums: public → intermodal
-- ─────────────────────────────────────────
ALTER TYPE IF EXISTS "public"."handover_status" SET SCHEMA "intermodal";
--> statement-breakpoint
ALTER TYPE IF EXISTS "public"."coordination_type" SET SCHEMA "intermodal";
--> statement-breakpoint
ALTER TYPE IF EXISTS "public"."coordination_status" SET SCHEMA "intermodal";
--> statement-breakpoint
ALTER TYPE IF EXISTS "public"."transfer_status" SET SCHEMA "intermodal";
