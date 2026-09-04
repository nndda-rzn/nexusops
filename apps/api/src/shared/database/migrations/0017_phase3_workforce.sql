-- Phase 3 Step 0: Workforce domain schema
-- employees, shifts, shift_schedules, crews, crew_members,
-- qualifications, certifications, assignments, availability

CREATE SCHEMA IF NOT EXISTS "workforce";
--> statement-breakpoint

-- Enums
CREATE TYPE "workforce"."employee_type" AS ENUM('PERMANENT', 'CONTRACT', 'OUTSOURCE');
--> statement-breakpoint
CREATE TYPE "workforce"."employee_status" AS ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'RESIGNED');
--> statement-breakpoint
CREATE TYPE "workforce"."shift_type" AS ENUM('DAY', 'EVENING', 'NIGHT', 'ROTATING');
--> statement-breakpoint
CREATE TYPE "workforce"."shift_schedule_status" AS ENUM('SCHEDULED', 'CONFIRMED', 'ATTENDED', 'ABSENT', 'LEAVE');
--> statement-breakpoint
CREATE TYPE "workforce"."crew_type" AS ENUM('CRANE', 'STEVEDORE', 'GATE', 'YARD', 'WAREHOUSE', 'RAIL', 'ROAD');
--> statement-breakpoint
CREATE TYPE "workforce"."crew_status" AS ENUM('AVAILABLE', 'ON_DUTY', 'OFF_DUTY');
--> statement-breakpoint
CREATE TYPE "workforce"."qualification_level" AS ENUM('BASIC', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');
--> statement-breakpoint
CREATE TYPE "workforce"."certification_status" AS ENUM('VALID', 'EXPIRED', 'SUSPENDED');
--> statement-breakpoint
CREATE TYPE "workforce"."assignment_type" AS ENUM('OPERATION', 'CRANE', 'GATE', 'SHIFT', 'TRIP', 'TRAIN', 'FLIGHT');
--> statement-breakpoint
CREATE TYPE "workforce"."assignment_status" AS ENUM('PLANNED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
--> statement-breakpoint
CREATE TYPE "workforce"."availability_type" AS ENUM('AVAILABLE', 'LEAVE', 'SICK', 'OFF', 'TRAINING');
--> statement-breakpoint

-- Employees
CREATE TABLE "workforce"."employees" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "user_id" text,
  "employee_number" text NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text,
  "department" text,
  "position" text,
  "type" "workforce"."employee_type" NOT NULL,
  "join_date" date NOT NULL,
  "status" "workforce"."employee_status" NOT NULL DEFAULT 'ACTIVE',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "employees_org_id_idx" ON "workforce"."employees" ("org_id");
--> statement-breakpoint
CREATE INDEX "employees_org_status_idx" ON "workforce"."employees" ("org_id", "status");
--> statement-breakpoint
CREATE UNIQUE INDEX "employees_org_number_unique" ON "workforce"."employees" ("org_id", "employee_number");
--> statement-breakpoint

-- Shifts
CREATE TABLE "workforce"."shifts" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "name" text NOT NULL,
  "start_time" text NOT NULL,
  "end_time" text NOT NULL,
  "duration_hours" integer NOT NULL,
  "break_duration_minutes" integer NOT NULL DEFAULT 0,
  "shift_type" "workforce"."shift_type" NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "shifts_org_idx" ON "workforce"."shifts" ("org_id");
--> statement-breakpoint

-- Shift Schedules
CREATE TABLE "workforce"."shift_schedules" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "employee_id" text NOT NULL REFERENCES "workforce"."employees"("id"),
  "shift_id" text NOT NULL REFERENCES "workforce"."shifts"("id"),
  "date" date NOT NULL,
  "status" "workforce"."shift_schedule_status" NOT NULL DEFAULT 'SCHEDULED',
  "actual_start" timestamptz,
  "actual_end" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "shift_schedules_org_idx" ON "workforce"."shift_schedules" ("org_id");
--> statement-breakpoint
CREATE INDEX "shift_schedules_employee_idx" ON "workforce"."shift_schedules" ("org_id", "employee_id");
--> statement-breakpoint
CREATE INDEX "shift_schedules_date_idx" ON "workforce"."shift_schedules" ("org_id", "date");
--> statement-breakpoint

-- Crews
CREATE TABLE "workforce"."crews" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "name" text NOT NULL,
  "crew_type" "workforce"."crew_type" NOT NULL,
  "leader_id" text REFERENCES "workforce"."employees"("id"),
  "shift_id" text REFERENCES "workforce"."shifts"("id"),
  "status" "workforce"."crew_status" NOT NULL DEFAULT 'AVAILABLE',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "crews_org_idx" ON "workforce"."crews" ("org_id");
--> statement-breakpoint
CREATE INDEX "crews_org_status_idx" ON "workforce"."crews" ("org_id", "status");
--> statement-breakpoint

-- Crew Members
CREATE TABLE "workforce"."crew_members" (
  "id" text PRIMARY KEY NOT NULL,
  "crew_id" text NOT NULL REFERENCES "workforce"."crews"("id"),
  "employee_id" text NOT NULL REFERENCES "workforce"."employees"("id"),
  "role" text NOT NULL,
  "joined_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "crew_members_crew_idx" ON "workforce"."crew_members" ("crew_id");
--> statement-breakpoint
CREATE INDEX "crew_members_employee_idx" ON "workforce"."crew_members" ("employee_id");
--> statement-breakpoint

-- Qualifications
CREATE TABLE "workforce"."qualifications" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "employee_id" text NOT NULL REFERENCES "workforce"."employees"("id"),
  "qualification_type" text NOT NULL,
  "level" "workforce"."qualification_level" NOT NULL,
  "acquired_at" date NOT NULL,
  "valid_until" date,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "qualifications_org_idx" ON "workforce"."qualifications" ("org_id");
--> statement-breakpoint
CREATE INDEX "qualifications_employee_idx" ON "workforce"."qualifications" ("employee_id");
--> statement-breakpoint

-- Certifications
CREATE TABLE "workforce"."certifications" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "employee_id" text NOT NULL REFERENCES "workforce"."employees"("id"),
  "certification_name" text NOT NULL,
  "issuing_body" text NOT NULL,
  "certificate_number" text NOT NULL,
  "issued_at" date NOT NULL,
  "expires_at" date,
  "status" "workforce"."certification_status" NOT NULL DEFAULT 'VALID',
  "document_id" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "certifications_org_idx" ON "workforce"."certifications" ("org_id");
--> statement-breakpoint
CREATE INDEX "certifications_employee_idx" ON "workforce"."certifications" ("employee_id");
--> statement-breakpoint
CREATE INDEX "certifications_status_idx" ON "workforce"."certifications" ("org_id", "status");
--> statement-breakpoint

-- Assignments
CREATE TABLE "workforce"."assignments" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "employee_id" text REFERENCES "workforce"."employees"("id"),
  "crew_id" text REFERENCES "workforce"."crews"("id"),
  "assignment_type" "workforce"."assignment_type" NOT NULL,
  "reference_id" text NOT NULL,
  "reference_type" text NOT NULL,
  "role" text,
  "scheduled_start" timestamptz NOT NULL,
  "scheduled_end" timestamptz NOT NULL,
  "actual_start" timestamptz,
  "actual_end" timestamptz,
  "status" "workforce"."assignment_status" NOT NULL DEFAULT 'PLANNED',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "assignments_org_idx" ON "workforce"."assignments" ("org_id");
--> statement-breakpoint
CREATE INDEX "assignments_employee_idx" ON "workforce"."assignments" ("org_id", "employee_id");
--> statement-breakpoint
CREATE INDEX "assignments_reference_idx" ON "workforce"."assignments" ("reference_id", "reference_type");
--> statement-breakpoint
CREATE INDEX "assignments_status_idx" ON "workforce"."assignments" ("org_id", "status");
--> statement-breakpoint

-- Availability
CREATE TABLE "workforce"."availability" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "employee_id" text NOT NULL REFERENCES "workforce"."employees"("id"),
  "date" date NOT NULL,
  "availability_type" "workforce"."availability_type" NOT NULL,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "availability_org_idx" ON "workforce"."availability" ("org_id");
--> statement-breakpoint
CREATE INDEX "availability_employee_date_idx" ON "workforce"."availability" ("employee_id", "date");
--> statement-breakpoint

-- RLS
ALTER TABLE "workforce"."employees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workforce"."shifts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workforce"."shift_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workforce"."crews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workforce"."crew_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workforce"."qualifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workforce"."certifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workforce"."assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workforce"."availability" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "workforce_employees_rls" ON "workforce"."employees"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "workforce_shifts_rls" ON "workforce"."shifts"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "workforce_shift_schedules_rls" ON "workforce"."shift_schedules"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "workforce_crews_rls" ON "workforce"."crews"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "workforce_crew_members_rls" ON "workforce"."crew_members"
  USING (EXISTS (
    SELECT 1 FROM "workforce"."crews" c
    WHERE c.id = crew_id AND c.org_id = current_setting('app.current_org_id', true)
  ));
--> statement-breakpoint
CREATE POLICY "workforce_qualifications_rls" ON "workforce"."qualifications"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "workforce_certifications_rls" ON "workforce"."certifications"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "workforce_assignments_rls" ON "workforce"."assignments"
  USING (org_id = current_setting('app.current_org_id', true));
--> statement-breakpoint
CREATE POLICY "workforce_availability_rls" ON "workforce"."availability"
  USING (org_id = current_setting('app.current_org_id', true));
