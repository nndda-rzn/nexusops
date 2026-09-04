import {
  pgSchema,
  text,
  timestamp,
  numeric,
  integer,
  boolean,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { ulid } from "ulid";

export const terminalSchema = pgSchema("terminal");

// ─────────────────────────────────────────
// Enums
// ─────────────────────────────────────────
export const terminalTypeEnum = pgEnum("terminal_type", [
  "CONTAINER",
  "BULK",
  "LIQUID",
  "RORO",
  "MULTIPURPOSE",
]);

export const berthStatusEnum = pgEnum("berth_status", [
  "AVAILABLE",
  "OCCUPIED",
  "MAINTENANCE",
  "RESERVED",
]);

export const gateTypeEnum = pgEnum("gate_type", ["IN", "OUT", "INOUT"]);
export const gateStatusEnum = pgEnum("gate_status", [
  "OPEN",
  "CLOSED",
  "RESTRICTED",
]);

export const craneTypeEnum = pgEnum("crane_type", [
  "STS",
  "RTG",
  "RMG",
  "MOBILE",
  "FORKLIFT",
]);

export const craneStatusEnum = pgEnum("crane_status", [
  "AVAILABLE",
  "OPERATING",
  "MAINTENANCE",
  "BREAKDOWN",
]);

export const berthAssignmentStatusEnum = pgEnum("berth_assignment_status", [
  "PLANNED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
]);

// ─────────────────────────────────────────
// Tables
// ─────────────────────────────────────────

export const terminals = terminalSchema.table(
  "terminals",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    orgId: text("org_id").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    type: terminalTypeEnum("type").notNull(),
    maxVesselLoa: numeric("max_vessel_loa"),
    maxVesselDraft: numeric("max_vessel_draft"),
    annualCapacityTeu: integer("annual_capacity_teu"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("terminals_org_id_idx").on(t.orgId),
    uniqueIndex("terminals_org_code_unique").on(t.orgId, t.code),
  ],
);

export const berths = terminalSchema.table(
  "berths",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    orgId: text("org_id").notNull(),
    terminalId: text("terminal_id").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    lengthM: numeric("length_m").notNull(),
    maxDraftM: numeric("max_draft_m").notNull(),
    maxVesselLoa: numeric("max_vessel_loa"),
    status: berthStatusEnum("status").notNull().default("AVAILABLE"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("berths_org_id_idx").on(t.orgId),
    index("berths_terminal_idx").on(t.orgId, t.terminalId),
    index("berths_status_idx").on(t.orgId, t.status),
    uniqueIndex("berths_org_code_unique").on(t.orgId, t.code),
  ],
);

export const berthAssignments = terminalSchema.table(
  "berth_assignments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    orgId: text("org_id").notNull(),
    portCallId: text("port_call_id").notNull(),
    berthId: text("berth_id").notNull(),
    plannedStart: timestamp("planned_start", { withTimezone: true }).notNull(),
    plannedEnd: timestamp("planned_end", { withTimezone: true }).notNull(),
    actualStart: timestamp("actual_start", { withTimezone: true }),
    actualEnd: timestamp("actual_end", { withTimezone: true }),
    status: berthAssignmentStatusEnum("status").notNull().default("PLANNED"),
    assignedBy: text("assigned_by").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("berth_assignments_org_idx").on(t.orgId),
    index("berth_assignments_berth_idx").on(t.orgId, t.berthId),
    index("berth_assignments_port_call_idx").on(t.orgId, t.portCallId),
    index("berth_assignments_status_idx").on(t.orgId, t.status),
  ],
);

export const gates = terminalSchema.table(
  "gates",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    orgId: text("org_id").notNull(),
    terminalId: text("terminal_id").notNull(),
    gateNumber: text("gate_number").notNull(),
    type: gateTypeEnum("type").notNull(),
    laneCount: integer("lane_count").notNull().default(1),
    status: gateStatusEnum("status").notNull().default("CLOSED"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("gates_org_id_idx").on(t.orgId),
    index("gates_terminal_idx").on(t.orgId, t.terminalId),
  ],
);

export const cranes = terminalSchema.table(
  "cranes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    orgId: text("org_id").notNull(),
    terminalId: text("terminal_id").notNull(),
    assetId: text("asset_id"), // FK ke assets.assets
    code: text("code").notNull(),
    type: craneTypeEnum("type").notNull(),
    capacityTonnes: numeric("capacity_tonnes"),
    maxOutreachM: numeric("max_outreach_m"),
    status: craneStatusEnum("status").notNull().default("AVAILABLE"),
    currentBerthId: text("current_berth_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("cranes_org_id_idx").on(t.orgId),
    index("cranes_terminal_idx").on(t.orgId, t.terminalId),
    index("cranes_status_idx").on(t.orgId, t.status),
    uniqueIndex("cranes_org_code_unique").on(t.orgId, t.code),
  ],
);
