-- D-03 FIX (remaining): Move identity and terminal-equipment enums from public schema
-- to their respective domain schemas.
-- identity enums were missed in 0010_enum_schema_fix.sql

-- ─────────────────────────────────────────
-- Identity enums: public → identity
-- ─────────────────────────────────────────
ALTER TYPE "public"."entity_type" SET SCHEMA "identity";
--> statement-breakpoint
ALTER TYPE "public"."org_status" SET SCHEMA "identity";
--> statement-breakpoint
ALTER TYPE "public"."user_status" SET SCHEMA "identity";
--> statement-breakpoint
ALTER TYPE "public"."login_status" SET SCHEMA "identity";
--> statement-breakpoint

-- Note: equipment_assignment_status was already moved in 0010_enum_schema_fix.sql
-- (line 55: ALTER TYPE "public"."equipment_assignment_status" SET SCHEMA "terminal")
-- No action needed for terminal-equipment.
