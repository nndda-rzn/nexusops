-- Phase 4A: Planning Engine — optimization job foundation + transactional outbox

CREATE SCHEMA IF NOT EXISTS "planning";
--> statement-breakpoint

-- Enums
CREATE TYPE "planning"."optimization_job_type" AS ENUM(
  'YARD_OPTIMIZATION', 'BERTH_SCHEDULING', 'CRANE_SCHEDULING',
  'WORKFORCE_SCHEDULING', 'ROUTE_OPTIMIZATION', 'TRAIN_SCHEDULING',
  'NETWORK_ANALYSIS', 'CRITICAL_PATH', 'DELAY_PROPAGATION'
);
--> statement-breakpoint
CREATE TYPE "planning"."optimization_job_status" AS ENUM(
  'PENDING', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'RETRYING', 'DEAD', 'CANCELLED'
);
--> statement-breakpoint

-- Optimization Jobs
CREATE TABLE "planning"."optimization_jobs" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "job_type" "planning"."optimization_job_type" NOT NULL,
  "status" "planning"."optimization_job_status" NOT NULL DEFAULT 'PENDING',
  "input" jsonb NOT NULL,
  "result" jsonb,
  "error" text,
  "retry_count" integer NOT NULL DEFAULT 0,
  "max_retries" integer NOT NULL DEFAULT 3,
  "next_retry_at" timestamptz,
  "worker_id" text,
  "claimed_at" timestamptz,
  "heartbeat_at" timestamptz,
  "idempotency_key" text,
  "created_by" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "queued_at" timestamptz,
  "started_at" timestamptz,
  "completed_at" timestamptz,
  "failed_at" timestamptz
);
--> statement-breakpoint
CREATE INDEX "optimization_jobs_org_idx" ON "planning"."optimization_jobs" ("org_id");
--> statement-breakpoint
CREATE INDEX "optimization_jobs_status_idx" ON "planning"."optimization_jobs" ("org_id", "status");
--> statement-breakpoint
CREATE INDEX "optimization_jobs_type_idx" ON "planning"."optimization_jobs" ("org_id", "job_type");
--> statement-breakpoint
CREATE INDEX "optimization_jobs_created_idx" ON "planning"."optimization_jobs" ("org_id", "created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "optimization_jobs_idempotency_unique" ON "planning"."optimization_jobs" ("org_id", "idempotency_key");
--> statement-breakpoint

-- Job Events (audit trail of lifecycle transitions)
CREATE TABLE "planning"."optimization_job_events" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "job_id" text NOT NULL REFERENCES "planning"."optimization_jobs"("id"),
  "from_status" "planning"."optimization_job_status",
  "to_status" "planning"."optimization_job_status" NOT NULL,
  "message" text,
  "payload" jsonb,
  "actor_id" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "optimization_job_events_job_idx" ON "planning"."optimization_job_events" ("org_id", "job_id");
--> statement-breakpoint
CREATE INDEX "optimization_job_events_created_idx" ON "planning"."optimization_job_events" ("org_id", "created_at");
--> statement-breakpoint

-- RLS
ALTER TABLE "planning"."optimization_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "planning"."optimization_job_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "planning_optimization_jobs_rls" ON "planning"."optimization_jobs"
  USING ("org_id" = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "planning_optimization_job_events_rls" ON "planning"."optimization_job_events"
  USING ("org_id" = current_setting('app.current_org_id', true));
--> statement-breakpoint

-- ─────────────────────────────────────────
-- Transactional outbox (shared schema)
-- ─────────────────────────────────────────

CREATE TYPE "shared"."outbox_event_status" AS ENUM('PENDING', 'PUBLISHED', 'FAILED');
--> statement-breakpoint
CREATE TABLE "shared"."outbox_events" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "event_type" text NOT NULL,
  "aggregate_type" text,
  "aggregate_id" text,
  "payload" jsonb NOT NULL,
  "status" "shared"."outbox_event_status" NOT NULL DEFAULT 'PENDING',
  "retry_count" integer NOT NULL DEFAULT 0,
  "last_error" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "published_at" timestamptz
);
--> statement-breakpoint
CREATE INDEX "outbox_events_status_idx" ON "shared"."outbox_events" ("status", "created_at");
--> statement-breakpoint
CREATE INDEX "outbox_events_org_idx" ON "shared"."outbox_events" ("org_id");
--> statement-breakpoint

ALTER TABLE "shared"."outbox_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "outbox_events_rls" ON "shared"."outbox_events"
  USING ("org_id" = current_setting('app.current_org_id', true));