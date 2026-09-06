-- Phase 6: Analytics — materialized views (non-transactional)
-- Applied via `bun run db:views` (plain postgres client, NOT the Drizzle
-- migrator): CREATE MATERIALIZED VIEW / REFRESH CONCURRENTLY are not allowed
-- inside a transaction block.
--
-- TENANT ISOLATION: PostgreSQL does NOT support RLS on materialized views
-- ("ALTER action ENABLE ROW SECURITY cannot be performed on relation...").
-- ADR-0007's "RLS tetap berlaku pada MV" is not achievable. Mitigation:
-- the analytics read API always filters org_id explicitly (defense-in-depth
-- pattern used across the repo). MV owner = nexusops, definition query
-- bypasses RLS on source tables → MV contains all orgs; the API query is the
-- tenant boundary.
-- GRANT SELECT: MV belongs to owner (nexusops) which already has full access;
-- explicit grant documents intent and future-proofs non-owner roles.

-- MV 1: Road trip KPIs daily
DROP MATERIALIZED VIEW IF EXISTS "analytics"."road_trip_kpis_daily";
CREATE MATERIALIZED VIEW "analytics"."road_trip_kpis_daily" AS
SELECT
  org_id,
  date_trunc('day', COALESCE(actual_departure, scheduled_departure)) AS day,
  COUNT(*) AS total_trips,
  COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed_trips,
  COUNT(*) FILTER (WHERE status = 'COMPLETED' AND delay_minutes <= 0) AS on_time_trips,
  COUNT(*) FILTER (WHERE status IN ('DELAYED', 'BREAKDOWN', 'CANCELLED')) AS delayed_trips,
  COALESCE(AVG(delay_minutes) FILTER (WHERE delay_minutes > 0), 0)::numeric(10,1) AS avg_delay_minutes
FROM "road"."trips"
GROUP BY org_id, date_trunc('day', COALESCE(actual_departure, scheduled_departure));
CREATE UNIQUE INDEX "road_trip_kpis_daily_uk" ON "analytics"."road_trip_kpis_daily" ("org_id", "day");
GRANT SELECT ON "analytics"."road_trip_kpis_daily" TO "nexusops";

-- MV 2: Maritime port call KPIs daily
DROP MATERIALIZED VIEW IF EXISTS "analytics"."maritime_port_call_kpis_daily";
CREATE MATERIALIZED VIEW "analytics"."maritime_port_call_kpis_daily" AS
SELECT
  org_id,
  date_trunc('day', COALESCE(ata, eta)) AS day,
  COUNT(*) AS total_calls,
  AVG(EXTRACT(EPOCH FROM (atd - ata)) / 3600)::numeric(10,2) AS avg_turnaround_hours,
  AVG(EXTRACT(EPOCH FROM (atb - ata)) / 3600)::numeric(10,2) AS avg_waiting_hours,
  COUNT(*) FILTER (WHERE status = 'DEPARTED' AND atd IS NOT NULL) AS departed_calls
FROM "maritime"."port_calls"
GROUP BY org_id, date_trunc('day', COALESCE(ata, eta));
CREATE UNIQUE INDEX "maritime_port_call_kpis_daily_uk" ON "analytics"."maritime_port_call_kpis_daily" ("org_id", "day");
GRANT SELECT ON "analytics"."maritime_port_call_kpis_daily" TO "nexusops";

-- MV 3: Operations delay KPIs daily
DROP MATERIALIZED VIEW IF EXISTS "analytics"."operations_delay_kpis_daily";
CREATE MATERIALIZED VIEW "analytics"."operations_delay_kpis_daily" AS
SELECT
  org_id,
  date_trunc('day', COALESCE(actual_start, scheduled_start, created_at)) AS day,
  COUNT(*) AS total_operations,
  COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed_operations,
  COUNT(*) FILTER (WHERE status = 'DELAYED' OR delay_minutes > 0) AS delayed_operations,
  COALESCE(AVG(delay_minutes) FILTER (WHERE delay_minutes > 0), 0)::numeric(10,1) AS avg_delay_minutes,
  COALESCE(MAX(delay_minutes), 0) AS max_delay_minutes
FROM "operations"."operations"
GROUP BY org_id, date_trunc('day', COALESCE(actual_start, scheduled_start, created_at));
CREATE UNIQUE INDEX "operations_delay_kpis_daily_uk" ON "analytics"."operations_delay_kpis_daily" ("org_id", "day");
GRANT SELECT ON "analytics"."operations_delay_kpis_daily" TO "nexusops";
