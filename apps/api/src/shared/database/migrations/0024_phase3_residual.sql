-- Phase 3 Residual — migration for P3R-02/P3R-03/P3R-04

-- ─────────────────────────────────────────
-- 1. Yard: to_slot_id nullable (OUTBOUND movement has no destination)
-- ─────────────────────────────────────────
ALTER TABLE "yard"."movements" ALTER COLUMN "to_slot_id" DROP NOT NULL;
--> statement-breakpoint

-- ─────────────────────────────────────────
-- 2. Warehouse: unique (warehouse_id, sku) for inventory upsert
-- ─────────────────────────────────────────
ALTER TABLE "warehouse"."inventory"
  ADD CONSTRAINT "inventory_warehouse_sku_unique" UNIQUE ("warehouse_id", "sku");
--> statement-breakpoint

-- ─────────────────────────────────────────
-- 3. Assets: RLS write restricted to owner org only
--    (previous FOR ALL policy allowed operator org to write owner rows)
-- ─────────────────────────────────────────
DROP POLICY IF EXISTS "assets_assets_rls" ON "assets"."assets";
--> statement-breakpoint
DROP POLICY IF EXISTS "assets_operator_assignments_rls" ON "assets"."operator_assignments";
--> statement-breakpoint
CREATE POLICY "assets_assets_select" ON "assets"."assets" FOR SELECT
  USING (
    "owner_org_id" = current_setting('app.current_org_id', true) OR
    "operator_org_id" = current_setting('app.current_org_id', true)
  );
--> statement-breakpoint
CREATE POLICY "assets_assets_write" ON "assets"."assets" FOR ALL
  USING ("owner_org_id" = current_setting('app.current_org_id', true))
  WITH CHECK ("owner_org_id" = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "assets_operator_assignments_select" ON "assets"."operator_assignments" FOR SELECT
  USING (
    "owner_org_id" = current_setting('app.current_org_id', true) OR
    "operator_org_id" = current_setting('app.current_org_id', true)
  );
--> statement-breakpoint
CREATE POLICY "assets_operator_assignments_write" ON "assets"."operator_assignments" FOR ALL
  USING ("owner_org_id" = current_setting('app.current_org_id', true))
  WITH CHECK ("owner_org_id" = current_setting('app.current_org_id', true));