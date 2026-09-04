import {
  pgSchema,
  text,
  timestamp,
  integer,
  numeric,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { ulid } from "ulid";
import {
  geometryPoint,
  geometryLine,
  geometryPolygon,
} from "@/shared/database/types/geometry";

// ─────────────────────────────────────────
// Schema
// ─────────────────────────────────────────
export const sharedMasterSchema = pgSchema("shared_master");

// ─────────────────────────────────────────
// Enums
// ─────────────────────────────────────────
export const portTypeEnum = sharedMasterSchema.enum("port_type", [
  "SEA",
  "RIVER",
  "INLAND",
]);
export const masterStatusEnum = sharedMasterSchema.enum("master_status", [
  "ACTIVE",
  "INACTIVE",
]);
export const terminalTypeEnum = sharedMasterSchema.enum("terminal_type", [
  "CONTAINER",
  "BULK",
  "LIQUID",
  "RORO",
  "MULTIPURPOSE",
]);
export const stationTypeEnum = sharedMasterSchema.enum("station_type", [
  "PORT",
  "DRY_PORT",
  "INLAND",
  "JUNCTION",
  "YARD",
]);
export const roadSegmentStatusEnum = sharedMasterSchema.enum(
  "road_segment_status",
  ["ACTIVE", "MAINTENANCE", "CLOSED"],
);
export const roadTypeEnum = sharedMasterSchema.enum("road_type", [
  "TOLL",
  "HIGHWAY",
  "PROVINCIAL",
  "LOCAL",
]);
export const railSegmentStatusEnum = sharedMasterSchema.enum(
  "rail_segment_status",
  ["ACTIVE", "MAINTENANCE", "CLOSED"],
);
export const geofenceTypeEnum = sharedMasterSchema.enum("geofence_type", [
  "TERMINAL",
  "PORT",
  "STATION",
  "WAREHOUSE",
  "AIRPORT",
  "CUSTOM",
]);
export const nodeTypeEnum = sharedMasterSchema.enum("node_type", [
  "PORT_GATE",
  "WAREHOUSE",
  "CHECKPOINT",
  "JUNCTION",
  "DESTINATION",
]);
export const changeProposalStatusEnum = sharedMasterSchema.enum(
  "change_proposal_status",
  ["PENDING", "APPROVED", "REJECTED"],
);
export const changeTypeEnum = sharedMasterSchema.enum("change_type", [
  "CREATE",
  "UPDATE",
  "DEACTIVATE",
]);

// ─────────────────────────────────────────
// Tables
// ─────────────────────────────────────────

// Ports (Pelabuhan)
export const ports = sharedMasterSchema.table(
  "ports",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    code: text("code").notNull().unique(), // UN/LOCODE e.g. IDJKT
    name: text("name").notNull(),
    country: text("country").notNull(),
    city: text("city").notNull(),
    location: geometryPoint("location"),
    type: portTypeEnum("type").notNull(),
    status: masterStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ports_status_idx").on(t.status),
    index("ports_type_idx").on(t.type),
  ],
);

// Terminals (shared master — berbeda dari terminal module)
export const sharedTerminals = sharedMasterSchema.table(
  "terminals",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    portId: text("port_id")
      .notNull()
      .references(() => ports.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    operatorOrgId: text("operator_org_id"),
    boundary: geometryPolygon("boundary"),
    type: terminalTypeEnum("type").notNull(),
    status: masterStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("shared_terminals_port_idx").on(t.portId),
    index("shared_terminals_status_idx").on(t.status),
    uniqueIndex("shared_terminals_code_unique").on(t.portId, t.code),
  ],
);

// Stations (Stasiun Kereta)
export const stations = sharedMasterSchema.table(
  "stations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    city: text("city").notNull(),
    location: geometryPoint("location"),
    type: stationTypeEnum("type").notNull(),
    operatorOrgId: text("operator_org_id"),
    status: masterStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("stations_status_idx").on(t.status),
    index("stations_type_idx").on(t.type),
  ],
);

// Airports (Bandara Cargo)
export const airports = sharedMasterSchema.table(
  "airports",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    iataCode: text("iata_code").notNull().unique(),
    icaoCode: text("icao_code").notNull().unique(),
    name: text("name").notNull(),
    city: text("city").notNull(),
    country: text("country").notNull(),
    location: geometryPoint("location"),
    operatorOrgId: text("operator_org_id"),
    status: masterStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("airports_status_idx").on(t.status)],
);

// Road Nodes
export const roadNodes = sharedMasterSchema.table(
  "road_nodes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    name: text("name"),
    nodeType: nodeTypeEnum("node_type").notNull(),
    location: geometryPoint("location").notNull(),
    status: masterStatusEnum("status").notNull().default("ACTIVE"),
  },
  (t) => [
    index("road_nodes_type_idx").on(t.nodeType),
    index("road_nodes_status_idx").on(t.status),
  ],
);

// Road Segments
export const roadSegments = sharedMasterSchema.table(
  "road_segments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    fromNodeId: text("from_node_id")
      .notNull()
      .references(() => roadNodes.id),
    toNodeId: text("to_node_id")
      .notNull()
      .references(() => roadNodes.id),
    name: text("name"),
    roadType: roadTypeEnum("road_type").notNull(),
    distanceKm: numeric("distance_km").notNull(),
    estimatedDurationMinutes: integer("estimated_duration_minutes").notNull(),
    geometry: geometryLine("geometry"),
    status: roadSegmentStatusEnum("status").notNull().default("ACTIVE"),
  },
  (t) => [
    index("road_segments_from_idx").on(t.fromNodeId),
    index("road_segments_to_idx").on(t.toNodeId),
    index("road_segments_status_idx").on(t.status),
  ],
);

// Rail Segments
export const railSegments = sharedMasterSchema.table(
  "rail_segments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    fromStationId: text("from_station_id")
      .notNull()
      .references(() => stations.id),
    toStationId: text("to_station_id")
      .notNull()
      .references(() => stations.id),
    lineName: text("line_name").notNull(),
    lengthKm: numeric("length_km").notNull(),
    maxSpeedKmh: integer("max_speed_kmh").notNull(),
    geometry: geometryLine("geometry"),
    status: railSegmentStatusEnum("status").notNull().default("ACTIVE"),
  },
  (t) => [
    index("rail_segments_from_idx").on(t.fromStationId),
    index("rail_segments_to_idx").on(t.toStationId),
    index("rail_segments_status_idx").on(t.status),
  ],
);

// Geofences
export const geofences = sharedMasterSchema.table(
  "geofences",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    name: text("name").notNull(),
    geofenceType: geofenceTypeEnum("geofence_type").notNull(),
    referenceId: text("reference_id"),
    boundary: geometryPolygon("boundary").notNull(),
    status: masterStatusEnum("status").notNull().default("ACTIVE"),
  },
  (t) => [
    index("geofences_type_idx").on(t.geofenceType),
    index("geofences_ref_idx").on(t.referenceId),
    index("geofences_status_idx").on(t.status),
  ],
);

// Commodity Types
export const commodityTypes = sharedMasterSchema.table(
  "commodity_types",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    hsCode: text("hs_code"),
    isHazmat: boolean("is_hazmat").notNull().default(false),
    isReefer: boolean("is_reefer").notNull().default(false),
    isOversized: boolean("is_oversized").notNull().default(false),
    handlingNotes: text("handling_notes"),
  },
  (t) => [index("commodity_types_hazmat_idx").on(t.isHazmat)],
);

// Change Proposals (Holding approval flow)
export const changeProposals = sharedMasterSchema.table(
  "change_proposals",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => ulid()),
    tableName: text("table_name").notNull(),
    recordId: text("record_id"),
    changeType: changeTypeEnum("change_type").notNull(),
    proposedData: text("proposed_data").notNull(), // JSON stored as text
    reason: text("reason").notNull(),
    proposedByOrgId: text("proposed_by_org_id").notNull(),
    proposedByUserId: text("proposed_by_user_id").notNull(),
    status: changeProposalStatusEnum("status").notNull().default("PENDING"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("change_proposals_status_idx").on(t.status),
    index("change_proposals_org_idx").on(t.proposedByOrgId),
  ],
);
