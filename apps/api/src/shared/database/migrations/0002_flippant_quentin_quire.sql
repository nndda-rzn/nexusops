ALTER TABLE "identity"."org_module_access" ADD CONSTRAINT "org_module_access_org_id_module_key_pk" PRIMARY KEY("org_id","module_key");--> statement-breakpoint
ALTER TABLE "identity"."role_permissions" ADD CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id");--> statement-breakpoint
ALTER TABLE "identity"."entity_data_access" ADD CONSTRAINT "entity_data_access_owner_org_id_organizations_id_fk" FOREIGN KEY ("owner_org_id") REFERENCES "identity"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."entity_data_access" ADD CONSTRAINT "entity_data_access_grantee_org_id_organizations_id_fk" FOREIGN KEY ("grantee_org_id") REFERENCES "identity"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."org_members" ADD CONSTRAINT "org_members_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "identity"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."org_members" ADD CONSTRAINT "org_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."org_members" ADD CONSTRAINT "org_members_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "identity"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."org_module_access" ADD CONSTRAINT "org_module_access_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "identity"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "identity"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "identity"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "identity"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."roles" ADD CONSTRAINT "roles_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "identity"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entity_data_access_grantee_idx" ON "identity"."entity_data_access" USING btree ("grantee_org_id");--> statement-breakpoint
CREATE INDEX "entity_data_access_resource_idx" ON "identity"."entity_data_access" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "login_history_user_id_idx" ON "identity"."login_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "login_history_attempted_at_idx" ON "identity"."login_history" USING btree ("attempted_at");--> statement-breakpoint
CREATE INDEX "org_members_org_id_idx" ON "identity"."org_members" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "org_members_user_id_idx" ON "identity"."org_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "org_members_org_user_unique" ON "identity"."org_members" USING btree ("org_id","user_id");--> statement-breakpoint
CREATE INDEX "org_module_access_org_id_idx" ON "identity"."org_module_access" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "organizations_entity_type_idx" ON "identity"."organizations" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "organizations_parent_org_id_idx" ON "identity"."organizations" USING btree ("parent_org_id");--> statement-breakpoint
CREATE INDEX "organizations_status_idx" ON "identity"."organizations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "identity"."refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_expires_at_idx" ON "identity"."refresh_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "roles_org_id_idx" ON "identity"."roles" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "identity"."users" USING btree ("status");