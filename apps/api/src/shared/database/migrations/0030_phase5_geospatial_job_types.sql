-- Phase 5 Fix F-01: Geospatial job types — enum swap (transaksional)
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction block, but the
-- Drizzle migrator wraps ALL migrations in ONE transaction (pg-core/dialect.js).
-- Replace the enum with a new full-value type instead: transactional, safe.
-- Precedent: 0029 (ADD VALUE) never applied anywhere — DB verified at 0027.

CREATE TYPE "planning"."optimization_job_type_new" AS ENUM(
  'YARD_OPTIMIZATION',
  'BERTH_SCHEDULING',
  'CRANE_SCHEDULING',
  'WORKFORCE_SCHEDULING',
  'ROUTE_OPTIMIZATION',
  'TRAIN_SCHEDULING',
  'NETWORK_ANALYSIS',
  'CRITICAL_PATH',
  'DELAY_PROPAGATION',
  'GEOFENCE_CHECK',
  'ROUTE_GEOJSON'
);
--> statement-breakpoint

ALTER TABLE "planning"."optimization_jobs"
  ALTER COLUMN "job_type"
  TYPE "planning"."optimization_job_type_new"
  USING ("job_type"::text::"planning"."optimization_job_type_new");
--> statement-breakpoint

DROP TYPE "planning"."optimization_job_type";
--> statement-breakpoint

ALTER TYPE "planning"."optimization_job_type_new" RENAME TO "optimization_job_type";