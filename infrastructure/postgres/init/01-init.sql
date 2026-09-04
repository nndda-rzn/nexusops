-- NexusOps PostgreSQL Initialization
-- Runs once when the container is first created

-- ─────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS ltree;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- Schemas
-- ─────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS operations;
CREATE SCHEMA IF NOT EXISTS shipments;
CREATE SCHEMA IF NOT EXISTS containers;
CREATE SCHEMA IF NOT EXISTS maritime;
CREATE SCHEMA IF NOT EXISTS rail;
CREATE SCHEMA IF NOT EXISTS road;
CREATE SCHEMA IF NOT EXISTS aviation;
CREATE SCHEMA IF NOT EXISTS terminal;
CREATE SCHEMA IF NOT EXISTS yard;
CREATE SCHEMA IF NOT EXISTS warehouse;
CREATE SCHEMA IF NOT EXISTS assets;
CREATE SCHEMA IF NOT EXISTS maintenance;
CREATE SCHEMA IF NOT EXISTS workforce;
CREATE SCHEMA IF NOT EXISTS planning;
CREATE SCHEMA IF NOT EXISTS billing;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS intermodal;
CREATE SCHEMA IF NOT EXISTS "group";
CREATE SCHEMA IF NOT EXISTS shared_master;
CREATE SCHEMA IF NOT EXISTS shared;
CREATE SCHEMA IF NOT EXISTS audit;

-- ─────────────────────────────────────────
-- Search path
-- ─────────────────────────────────────────
ALTER DATABASE nexusops SET search_path TO
  public,
  identity,
  operations,
  shipments,
  containers,
  maritime,
  rail,
  road,
  aviation,
  terminal,
  yard,
  warehouse,
  assets,
  maintenance,
  workforce,
  planning,
  billing,
  analytics,
  intermodal,
  "group",
  shared_master,
  shared,
  audit;

-- ─────────────────────────────────────────
-- Grant privileges to app user
-- ─────────────────────────────────────────
GRANT ALL PRIVILEGES ON DATABASE nexusops TO nexusops;
GRANT ALL ON SCHEMA
  public,
  identity,
  operations,
  shipments,
  containers,
  maritime,
  rail,
  road,
  aviation,
  terminal,
  yard,
  warehouse,
  assets,
  maintenance,
  workforce,
  planning,
  billing,
  analytics,
  intermodal,
  "group",
  shared_master,
  shared,
  audit
TO nexusops;

-- Audit schema: app can INSERT but not UPDATE/DELETE
REVOKE UPDATE, DELETE ON ALL TABLES IN SCHEMA audit FROM nexusops;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit
  REVOKE UPDATE, DELETE ON TABLES FROM nexusops;
