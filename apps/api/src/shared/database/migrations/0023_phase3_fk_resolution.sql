-- Phase 3 Step 6: Resolve Phase 2 text nullable FKs now that workforce and assets schemas exist
-- All constraints are nullable (ON DELETE SET NULL) so existing NULL values are preserved.

-- ─────────────────────────────────────────
-- rail.crew_assignments.employee_id → workforce.employees(id)
-- ─────────────────────────────────────────
ALTER TABLE "rail"."crew_assignments"
  ADD CONSTRAINT "rail_crew_assignments_employee_id_fk"
  FOREIGN KEY ("employee_id") REFERENCES "workforce"."employees"("id")
  ON DELETE SET NULL;
--> statement-breakpoint

-- ─────────────────────────────────────────
-- road.drivers.employee_id → workforce.employees(id)
-- ─────────────────────────────────────────
ALTER TABLE "road"."drivers"
  ADD CONSTRAINT "road_drivers_employee_id_fk"
  FOREIGN KEY ("employee_id") REFERENCES "workforce"."employees"("id")
  ON DELETE SET NULL;
--> statement-breakpoint

-- ─────────────────────────────────────────
-- terminal.cranes.asset_id → assets.assets(id)
-- ─────────────────────────────────────────
ALTER TABLE "terminal"."cranes"
  ADD CONSTRAINT "terminal_cranes_asset_id_fk"
  FOREIGN KEY ("asset_id") REFERENCES "assets"."assets"("id")
  ON DELETE SET NULL;
--> statement-breakpoint

-- ─────────────────────────────────────────
-- road.vehicles.asset_id → assets.assets(id)
-- ─────────────────────────────────────────
ALTER TABLE "road"."vehicles"
  ADD CONSTRAINT "road_vehicles_asset_id_fk"
  FOREIGN KEY ("asset_id") REFERENCES "assets"."assets"("id")
  ON DELETE SET NULL;
--> statement-breakpoint

-- ─────────────────────────────────────────
-- aviation.crew_assignments.employee_id → workforce.employees(id)
-- ─────────────────────────────────────────
ALTER TABLE "aviation"."crew_assignments"
  ADD CONSTRAINT "aviation_crew_assignments_employee_id_fk"
  FOREIGN KEY ("employee_id") REFERENCES "workforce"."employees"("id")
  ON DELETE SET NULL;
--> statement-breakpoint

-- ─────────────────────────────────────────
-- maintenance.work_orders.assigned_to → workforce.employees(id)
-- ─────────────────────────────────────────
ALTER TABLE "maintenance"."work_orders"
  ADD CONSTRAINT "maintenance_work_orders_assigned_to_fk"
  FOREIGN KEY ("assigned_to") REFERENCES "workforce"."employees"("id")
  ON DELETE SET NULL;
--> statement-breakpoint

-- ─────────────────────────────────────────
-- rail.trainsets.locomotive_id → assets.assets(id)
-- ─────────────────────────────────────────
ALTER TABLE "rail"."trainsets"
  ADD CONSTRAINT "rail_trainsets_locomotive_id_fk"
  FOREIGN KEY ("locomotive_id") REFERENCES "assets"."assets"("id")
  ON DELETE SET NULL;
--> statement-breakpoint

-- ─────────────────────────────────────────
-- workforce.employees.user_id → identity.users(id)
-- ─────────────────────────────────────────
ALTER TABLE "workforce"."employees"
  ADD CONSTRAINT "workforce_employees_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL;
