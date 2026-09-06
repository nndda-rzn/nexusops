-- Phase 5 Fix F-04: Geofence membership state (entered/exited delta tracking)
-- Vehicle org-scoped: RLS filters org_id = current_org_id (not shared read-all)
CREATE TABLE "shared_master"."geofence_memberships" (
  "geofence_id" text NOT NULL REFERENCES "shared_master"."geofences"("id"),
  "vehicle_id" text NOT NULL,
  "org_id" text NOT NULL,
  "entered_at" timestamptz NOT NULL DEFAULT now(),
  "last_seen_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("geofence_id", "vehicle_id")
);
--> statement-breakpoint
CREATE INDEX "geofence_memberships_org_idx" ON "shared_master"."geofence_memberships" ("org_id");
--> statement-breakpoint
CREATE INDEX "geofence_memberships_vehicle_idx" ON "shared_master"."geofence_memberships" ("vehicle_id");
--> statement-breakpoint

ALTER TABLE "shared_master"."geofence_memberships" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "geofence_memberships_read" ON "shared_master"."geofence_memberships"
  AS PERMISSIVE FOR SELECT
  USING ("org_id" = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "geofence_memberships_write" ON "shared_master"."geofence_memberships"
  AS PERMISSIVE FOR ALL
  USING ("org_id" = current_setting('app.current_org_id', true))
  WITH CHECK ("org_id" = current_setting('app.current_org_id', true));