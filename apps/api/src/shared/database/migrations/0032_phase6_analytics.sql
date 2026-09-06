-- Phase 6: Analytics — schema bootstrap
-- NOTE: materialized views CANNOT be created here — Drizzle migrator wraps all
-- statements in one transaction, and CREATE MATERIALIZED VIEW / REFRESH
-- CONCURRENTLY are not allowed inside a transaction block (same class as the
-- ALTER TYPE ADD VALUE issue, F-01 Phase 5).
-- The MVs + indexes + RLS live in shared/database/analytics-views.sql, applied
-- via `bun run db:views` (non-transactional plain client).
CREATE SCHEMA IF NOT EXISTS "analytics";