-- Phase 5: Geospatial
-- GIST spatial index for road.routes geometry (road_nodes/road_segments done in 0012, positions in 0013/0015)
CREATE INDEX "routes_geom_idx" ON "road"."routes" USING GIST ("geometry");
--> statement-breakpoint
CREATE INDEX "routes_origin_idx" ON "road"."routes" USING GIST ("origin");
--> statement-breakpoint
CREATE INDEX "routes_destination_idx" ON "road"."routes" USING GIST ("destination");
--> statement-breakpoint

-- Geofence audit timestamps (created_at default now, updated_at maintained by API)
ALTER TABLE "shared_master"."geofences"
  ADD COLUMN "created_at" timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN "updated_at" timestamptz NOT NULL DEFAULT now();
--> statement-breakpoint

-- GIST spatial index on geofence boundary for containment checks
CREATE INDEX "geofences_boundary_geom_idx" ON "shared_master"."geofences" USING GIST ("boundary");