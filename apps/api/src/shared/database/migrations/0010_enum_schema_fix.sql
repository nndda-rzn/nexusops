-- D-03 FIX: Move all domain enums from public schema to their respective domain schemas
-- pgEnum() in Drizzle creates enums in the public schema by default.
-- schema.enum() creates them in the correct schema.
-- This migration moves existing enums to the correct schemas.

-- ─────────────────────────────────────────
-- Operations enums: public → operations
-- ─────────────────────────────────────────
ALTER TYPE "public"."operation_type" SET SCHEMA "operations";
--> statement-breakpoint
ALTER TYPE "public"."operation_status" SET SCHEMA "operations";
--> statement-breakpoint
ALTER TYPE "public"."operation_priority" SET SCHEMA "operations";
--> statement-breakpoint
ALTER TYPE "public"."dependency_type" SET SCHEMA "operations";
--> statement-breakpoint
ALTER TYPE "public"."intervention_type" SET SCHEMA "operations";
--> statement-breakpoint
ALTER TYPE "public"."intervention_status" SET SCHEMA "operations";
--> statement-breakpoint

-- ─────────────────────────────────────────
-- Containers enums: public → containers
-- ─────────────────────────────────────────
ALTER TYPE "public"."container_type" SET SCHEMA "containers";
--> statement-breakpoint
ALTER TYPE "public"."container_size" SET SCHEMA "containers";
--> statement-breakpoint
ALTER TYPE "public"."container_status" SET SCHEMA "containers";
--> statement-breakpoint
ALTER TYPE "public"."movement_type" SET SCHEMA "containers";
--> statement-breakpoint
ALTER TYPE "public"."hold_type" SET SCHEMA "containers";
--> statement-breakpoint
ALTER TYPE "public"."hold_status" SET SCHEMA "containers";
--> statement-breakpoint

-- ─────────────────────────────────────────
-- Terminal enums: public → terminal
-- ─────────────────────────────────────────
ALTER TYPE "public"."terminal_type" SET SCHEMA "terminal";
--> statement-breakpoint
ALTER TYPE "public"."berth_status" SET SCHEMA "terminal";
--> statement-breakpoint
ALTER TYPE "public"."gate_type" SET SCHEMA "terminal";
--> statement-breakpoint
ALTER TYPE "public"."gate_status" SET SCHEMA "terminal";
--> statement-breakpoint
ALTER TYPE "public"."crane_type" SET SCHEMA "terminal";
--> statement-breakpoint
ALTER TYPE "public"."crane_status" SET SCHEMA "terminal";
--> statement-breakpoint
ALTER TYPE "public"."berth_assignment_status" SET SCHEMA "terminal";
--> statement-breakpoint
ALTER TYPE "public"."equipment_assignment_status" SET SCHEMA "terminal";
--> statement-breakpoint

-- ─────────────────────────────────────────
-- Shipments enums: public → shipments
-- ─────────────────────────────────────────
ALTER TYPE "public"."shipment_type" SET SCHEMA "shipments";
--> statement-breakpoint
ALTER TYPE "public"."shipment_status" SET SCHEMA "shipments";
--> statement-breakpoint
ALTER TYPE "public"."leg_mode" SET SCHEMA "shipments";
--> statement-breakpoint
ALTER TYPE "public"."leg_status" SET SCHEMA "shipments";
--> statement-breakpoint
ALTER TYPE "public"."exception_status" SET SCHEMA "shipments";
--> statement-breakpoint

-- ─────────────────────────────────────────
-- Intermodal enums: public → intermodal
-- ─────────────────────────────────────────
ALTER TYPE "public"."handover_status" SET SCHEMA "intermodal";
--> statement-breakpoint
ALTER TYPE "public"."coordination_type" SET SCHEMA "intermodal";
--> statement-breakpoint
ALTER TYPE "public"."coordination_status" SET SCHEMA "intermodal";
--> statement-breakpoint
ALTER TYPE "public"."transfer_status" SET SCHEMA "intermodal";
