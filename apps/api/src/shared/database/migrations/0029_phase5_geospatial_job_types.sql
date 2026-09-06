-- Phase 5: Geospatial job types
-- Extend planning.optimization_job_type enum with compute geospatial handlers
ALTER TYPE "planning"."optimization_job_type" ADD VALUE IF NOT EXISTS 'GEOFENCE_CHECK';
--> statement-breakpoint
ALTER TYPE "planning"."optimization_job_type" ADD VALUE IF NOT EXISTS 'ROUTE_GEOJSON';