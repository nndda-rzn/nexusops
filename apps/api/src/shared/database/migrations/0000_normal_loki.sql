CREATE SCHEMA "identity";
--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('HOLDING', 'MARITIME', 'RAIL', 'ROAD', 'WAREHOUSE', 'AVIATION');--> statement-breakpoint
CREATE TYPE "public"."login_status" AS ENUM('SUCCESS', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."org_status" AS ENUM('ACTIVE', 'SUSPENDED', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TABLE "identity"."entity_data_access" (
	"id" text PRIMARY KEY NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"owner_org_id" text NOT NULL,
	"grantee_org_id" text NOT NULL,
	"access_type" text DEFAULT 'READ' NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"granted_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity"."login_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"org_id" text,
	"entity_type" text,
	"ip_address" text,
	"user_agent" text,
	"status" "login_status" NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity"."org_members" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role_id" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"invited_by" text
);
--> statement-breakpoint
CREATE TABLE "identity"."org_module_access" (
	"org_id" text NOT NULL,
	"module_key" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"granted_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity"."organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"parent_org_id" text,
	"hierarchy_path" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"entity_type" "entity_type" NOT NULL,
	"status" "org_status" DEFAULT 'ACTIVE' NOT NULL,
	"timezone" text DEFAULT 'Asia/Jakarta' NOT NULL,
	"currency" text DEFAULT 'IDR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "identity"."permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"description" text,
	"module" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "identity"."refresh_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"org_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"ip_address" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "identity"."role_permissions" (
	"role_id" text NOT NULL,
	"permission_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity"."roles" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity"."users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"mfa_secret" text,
	"last_login_at" timestamp with time zone,
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
