-- ─────────────────────────────────────────
-- Extensions (harus pertama sebelum apapun yang bergantung padanya)
-- ─────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS ltree;

-- ─────────────────────────────────────────
-- Alter hierarchy_path ke ltree type
-- ─────────────────────────────────────────
ALTER TABLE "identity"."organizations"
  ALTER COLUMN "hierarchy_path" TYPE ltree USING "hierarchy_path"::ltree;

-- ─────────────────────────────────────────
-- Indexes untuk identity schema
-- (dibuat SETELAH ltree extension dan column type change)
-- ─────────────────────────────────────────

-- organizations
CREATE INDEX "organizations_entity_type_idx" ON "identity"."organizations" ("entity_type");
CREATE INDEX "organizations_parent_org_id_idx" ON "identity"."organizations" ("parent_org_id");
CREATE INDEX "organizations_status_idx" ON "identity"."organizations" ("status");
CREATE INDEX "organizations_hierarchy_path_idx" ON "identity"."organizations" USING GIST ("hierarchy_path");

-- users
CREATE INDEX "users_status_idx" ON "identity"."users" ("status");

-- org_members
CREATE INDEX "org_members_org_id_idx" ON "identity"."org_members" ("org_id");
CREATE INDEX "org_members_user_id_idx" ON "identity"."org_members" ("user_id");
CREATE UNIQUE INDEX "org_members_org_user_unique" ON "identity"."org_members" ("org_id", "user_id");

-- org_module_access
CREATE INDEX "org_module_access_org_id_idx" ON "identity"."org_module_access" ("org_id");
CREATE UNIQUE INDEX "org_module_access_org_module_unique" ON "identity"."org_module_access" ("org_id", "module_key");

-- roles
CREATE INDEX "roles_org_id_idx" ON "identity"."roles" ("org_id");

-- refresh_tokens
CREATE INDEX "refresh_tokens_user_id_idx" ON "identity"."refresh_tokens" ("user_id");
CREATE INDEX "refresh_tokens_expires_at_idx" ON "identity"."refresh_tokens" ("expires_at");

-- login_history
CREATE INDEX "login_history_user_id_idx" ON "identity"."login_history" ("user_id");
CREATE INDEX "login_history_attempted_at_idx" ON "identity"."login_history" ("attempted_at" DESC);

-- entity_data_access
CREATE INDEX "entity_data_access_grantee_idx" ON "identity"."entity_data_access" ("grantee_org_id");
CREATE INDEX "entity_data_access_resource_idx" ON "identity"."entity_data_access" ("resource_type", "resource_id");

-- ─────────────────────────────────────────
-- Row Level Security (RLS)
-- ─────────────────────────────────────────

ALTER TABLE "identity"."organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "identity"."org_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "identity"."org_module_access" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "identity"."roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "identity"."role_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "identity"."refresh_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "identity"."login_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "identity"."entity_data_access" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "identity"."permissions" ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────
-- RLS Policies — organizations
-- ─────────────────────────────────────────

CREATE POLICY "organizations_entity_isolation"
  ON "identity"."organizations"
  AS PERMISSIVE FOR SELECT
  USING (
    id = current_setting('app.current_org_id', true)
    OR parent_org_id = current_setting('app.current_org_id', true)
  );

CREATE POLICY "organizations_holding_read_all"
  ON "identity"."organizations"
  AS PERMISSIVE FOR SELECT
  USING (
    current_setting('app.entity_type', true) = 'HOLDING'
    AND (
      hierarchy_path <@ (
        SELECT hierarchy_path FROM "identity"."organizations"
        WHERE id = current_setting('app.holding_id', true)
      )
      OR id = current_setting('app.holding_id', true)
    )
  );

CREATE POLICY "organizations_write"
  ON "identity"."organizations"
  AS PERMISSIVE FOR ALL
  USING (
    id = current_setting('app.current_org_id', true)
    OR current_setting('app.entity_type', true) = 'HOLDING'
  );

-- ─────────────────────────────────────────
-- RLS Policies — org_members
-- ─────────────────────────────────────────

CREATE POLICY "org_members_isolation"
  ON "identity"."org_members"
  AS PERMISSIVE FOR ALL
  USING (
    org_id = current_setting('app.current_org_id', true)
    OR current_setting('app.entity_type', true) = 'HOLDING'
  );

-- ─────────────────────────────────────────
-- RLS Policies — org_module_access
-- ─────────────────────────────────────────

CREATE POLICY "org_module_access_isolation"
  ON "identity"."org_module_access"
  AS PERMISSIVE FOR ALL
  USING (
    org_id = current_setting('app.current_org_id', true)
    OR current_setting('app.entity_type', true) = 'HOLDING'
  );

-- ─────────────────────────────────────────
-- RLS Policies — roles
-- ─────────────────────────────────────────

CREATE POLICY "roles_isolation"
  ON "identity"."roles"
  AS PERMISSIVE FOR ALL
  USING (
    org_id = current_setting('app.current_org_id', true)
    OR current_setting('app.entity_type', true) = 'HOLDING'
  );

-- ─────────────────────────────────────────
-- RLS Policies — permissions (global read, holding write)
-- ─────────────────────────────────────────

CREATE POLICY "permissions_read_all"
  ON "identity"."permissions"
  AS PERMISSIVE FOR SELECT
  USING (true);

CREATE POLICY "permissions_write_holding"
  ON "identity"."permissions"
  AS PERMISSIVE FOR ALL
  USING (current_setting('app.entity_type', true) = 'HOLDING');

-- ─────────────────────────────────────────
-- RLS Policies — role_permissions
-- KRITIS: RLS harus punya policy atau semua akses diblokir
-- ─────────────────────────────────────────

CREATE POLICY "role_permissions_read"
  ON "identity"."role_permissions"
  AS PERMISSIVE FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "identity"."roles" r
      WHERE r.id = role_id
        AND (
          r.org_id = current_setting('app.current_org_id', true)
          OR current_setting('app.entity_type', true) = 'HOLDING'
        )
    )
  );

CREATE POLICY "role_permissions_write"
  ON "identity"."role_permissions"
  AS PERMISSIVE FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "identity"."roles" r
      WHERE r.id = role_id
        AND (
          r.org_id = current_setting('app.current_org_id', true)
          OR current_setting('app.entity_type', true) = 'HOLDING'
        )
    )
  );

-- ─────────────────────────────────────────
-- RLS Policies — refresh_tokens
-- ─────────────────────────────────────────

CREATE POLICY "refresh_tokens_isolation"
  ON "identity"."refresh_tokens"
  AS PERMISSIVE FOR ALL
  USING (
    org_id = current_setting('app.current_org_id', true)
    OR current_setting('app.entity_type', true) = 'HOLDING'
  );

-- ─────────────────────────────────────────
-- RLS Policies — login_history
-- ─────────────────────────────────────────

CREATE POLICY "login_history_isolation"
  ON "identity"."login_history"
  AS PERMISSIVE FOR ALL
  USING (
    org_id = current_setting('app.current_org_id', true)
    OR current_setting('app.entity_type', true) = 'HOLDING'
    OR org_id IS NULL
  );

-- ─────────────────────────────────────────
-- RLS Policies — entity_data_access
-- ─────────────────────────────────────────

CREATE POLICY "entity_data_access_policy"
  ON "identity"."entity_data_access"
  AS PERMISSIVE FOR ALL
  USING (
    owner_org_id = current_setting('app.current_org_id', true)
    OR grantee_org_id = current_setting('app.current_org_id', true)
    OR current_setting('app.entity_type', true) = 'HOLDING'
  );

-- ─────────────────────────────────────────
-- audit schema: INSERT only, no UPDATE/DELETE
-- ─────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'audit') THEN
    REVOKE UPDATE, DELETE ON ALL TABLES IN SCHEMA audit FROM nexusops;
  END IF;
END $$;
