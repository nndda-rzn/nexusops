CREATE TYPE "public"."equipment_assignment_status" AS ENUM('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "terminal"."equipment_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"crane_id" text NOT NULL,
	"berth_id" text NOT NULL,
	"port_call_id" text NOT NULL,
	"planned_start" timestamp with time zone NOT NULL,
	"planned_end" timestamp with time zone NOT NULL,
	"actual_start" timestamp with time zone,
	"actual_end" timestamp with time zone,
	"assigned_moves" integer DEFAULT 0 NOT NULL,
	"completed_moves" integer DEFAULT 0 NOT NULL,
	"status" "equipment_assignment_status" DEFAULT 'PLANNED' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "equip_assignments_org_idx" ON "terminal"."equipment_assignments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "equip_assignments_crane_idx" ON "terminal"."equipment_assignments" USING btree ("org_id","crane_id");--> statement-breakpoint
CREATE INDEX "equip_assignments_berth_idx" ON "terminal"."equipment_assignments" USING btree ("org_id","berth_id");--> statement-breakpoint
CREATE INDEX "equip_assignments_status_idx" ON "terminal"."equipment_assignments" USING btree ("org_id","status");