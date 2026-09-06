import { db } from '@/shared/database/client'
import { organizations, users, roles, orgMembers, orgModuleAccess } from '@/shared/database/schema/identity'
import { geofences } from '@/shared/database/schema/shared-master'
import { vehicles, routes, vehiclePositions } from '@/shared/database/schema/road'
import { eq, and } from 'drizzle-orm'
import { logger } from '@/shared/logging'
import { hashPassword } from '@/shared/auth/password'

// ─────────────────────────────────────────
// Seed data
// Idempotent re-runs. Two strategies combined:
//  1. Resolve existing rows by natural key (slug/email/name) → reuse their ID
//     so FK references stay valid across runs on an already-seeded DB.
//  2. Deterministic fallback ULIDs for fresh DBs.
// Random IDs per run break onConflictDoNothing (parent skipped by unique key,
// child FK references a never-inserted ID → FK violation) and duplicate
// non-unique tables.
// ─────────────────────────────────────────

let HOLDING_ID = '01ARZ3NDEKTSV4RRFFQ69G5FAV'
let MARITIME_ID = '01ARZ3NDEKTSV4RRFFQ69G5FBW'
let RAIL_ID = '01ARZ3NDEKTSV4RRFFQ69G5FCX'
let ROAD_ID = '01ARZ3NDEKTSV4RRFFQ69G5FDY'
let WAREHOUSE_ID = '01ARZ3NDEKTSV4RRFFQ69G5FEZ'

let ADMIN_USER_ID = '01ARZ3NDEKTSV4RRFFQ69G5FFA'
let MARITIME_ADMIN_ID = '01ARZ3NDEKTSV4RRFFQ69G5FGB'

// Resolve existing ID by column match, fallback to deterministic ID.
// Keeps FK refs stable whether the DB was seeded before or is fresh.
async function resolveOrgId(fallbackId: string, slug: string): Promise<string> {
  const [row] = await db.select({ id: organizations.id }).from(organizations)
    .where(eq(organizations.slug, slug)).limit(1)
  return row?.id ?? fallbackId
}

async function resolveUserId(fallbackId: string, email: string): Promise<string> {
  const [row] = await db.select({ id: users.id }).from(users)
    .where(eq(users.email, email)).limit(1)
  return row?.id ?? fallbackId
}

async function resolveRoleId(fallbackId: string, orgId: string, name: string): Promise<string> {
  const [row] = await db.select({ id: roles.id }).from(roles)
    .where(and(eq(roles.orgId, orgId), eq(roles.name, name))).limit(1)
  return row?.id ?? fallbackId
}

async function seed() {
  logger.info('Starting database seed...')

  // Resolve existing IDs on pre-seeded DBs (idempotent re-runs):
  // reuse existing row IDs so child FK refs stay valid; deterministic
  // fallback for fresh DBs.
  HOLDING_ID = await resolveOrgId(HOLDING_ID, 'nexusops-holding')
  MARITIME_ID = await resolveOrgId(MARITIME_ID, 'entitas-pelayaran')
  RAIL_ID = await resolveOrgId(RAIL_ID, 'entitas-kereta')
  ROAD_ID = await resolveOrgId(ROAD_ID, 'entitas-trucking')
  WAREHOUSE_ID = await resolveOrgId(WAREHOUSE_ID, 'entitas-warehouse')
  ADMIN_USER_ID = await resolveUserId(ADMIN_USER_ID, 'admin@nexusops.io')
  MARITIME_ADMIN_ID = await resolveUserId(MARITIME_ADMIN_ID, 'ops@pelayaran.nexusops.io')

  // ─────────────────────────────────────────
  // Organizations
  // ─────────────────────────────────────────
  await db.insert(organizations).values([
    {
      id: HOLDING_ID,
      name: 'NexusOps Holding',
      slug: 'nexusops-holding',
      entityType: 'HOLDING',
      hierarchyPath: 'nexusops',
      status: 'ACTIVE',
    },
    {
      id: MARITIME_ID,
      parentOrgId: HOLDING_ID,
      name: 'Entitas Pelayaran',
      slug: 'entitas-pelayaran',
      entityType: 'MARITIME',
      hierarchyPath: 'nexusops.pelayaran',
      status: 'ACTIVE',
    },
    {
      id: RAIL_ID,
      parentOrgId: HOLDING_ID,
      name: 'Entitas Kereta',
      slug: 'entitas-kereta',
      entityType: 'RAIL',
      hierarchyPath: 'nexusops.kereta',
      status: 'ACTIVE',
    },
    {
      id: ROAD_ID,
      parentOrgId: HOLDING_ID,
      name: 'Entitas Trucking',
      slug: 'entitas-trucking',
      entityType: 'ROAD',
      hierarchyPath: 'nexusops.trucking',
      status: 'ACTIVE',
    },
    {
      id: WAREHOUSE_ID,
      parentOrgId: HOLDING_ID,
      name: 'Entitas Warehouse',
      slug: 'entitas-warehouse',
      entityType: 'WAREHOUSE',
      hierarchyPath: 'nexusops.warehouse',
      status: 'ACTIVE',
    },
  ]).onConflictDoNothing()

  logger.info('Organizations seeded')

  // ─────────────────────────────────────────
  // Users
  // ─────────────────────────────────────────
  const adminPasswordHash = await hashPassword('Admin@123456')
  const maritimePasswordHash = await hashPassword('Maritime@123456')

  await db.insert(users).values([
    {
      id: ADMIN_USER_ID,
      email: 'admin@nexusops.io',
      name: 'Platform Admin',
      passwordHash: adminPasswordHash,
      status: 'ACTIVE',
    },
    {
      id: MARITIME_ADMIN_ID,
      email: 'ops@pelayaran.nexusops.io',
      name: 'Maritime Ops Manager',
      passwordHash: maritimePasswordHash,
      status: 'ACTIVE',
    },
  ]).onConflictDoNothing()

  logger.info('Users seeded')

  // ─────────────────────────────────────────
  // Roles
  // ─────────────────────────────────────────
  let HOLDING_ADMIN_ROLE_ID = '01ARZ3NDEKTSV4RRFFQ69G5GHC'
  let MARITIME_OPS_ROLE_ID = '01ARZ3NDEKTSV4RRFFQ69G5HID'
  HOLDING_ADMIN_ROLE_ID = await resolveRoleId(HOLDING_ADMIN_ROLE_ID, HOLDING_ID, 'platform_admin')
  MARITIME_OPS_ROLE_ID = await resolveRoleId(MARITIME_OPS_ROLE_ID, MARITIME_ID, 'operations_manager')

  await db.insert(roles).values([
    {
      id: HOLDING_ADMIN_ROLE_ID,
      orgId: HOLDING_ID,
      name: 'platform_admin',
      description: 'Full system access',
      isSystem: true,
    },
    {
      id: MARITIME_OPS_ROLE_ID,
      orgId: MARITIME_ID,
      name: 'operations_manager',
      description: 'Maritime operations manager',
      isSystem: true,
    },
  ]).onConflictDoNothing()

  logger.info('Roles seeded')

  // ─────────────────────────────────────────
  // Org Members
  // ─────────────────────────────────────────
  await db.insert(orgMembers).values([
    {
      id: '01ARZ3NDEKTSV4RRFFQ69G5IJE',
      orgId: HOLDING_ID,
      userId: ADMIN_USER_ID,
      roleId: HOLDING_ADMIN_ROLE_ID,
    },
    {
      id: '01ARZ3NDEKTSV4RRFFQ69G5JKF',
      orgId: MARITIME_ID,
      userId: MARITIME_ADMIN_ID,
      roleId: MARITIME_OPS_ROLE_ID,
    },
  ]).onConflictDoNothing()

  logger.info('Org members seeded')

  // ─────────────────────────────────────────
  // Module Access
  // ─────────────────────────────────────────
  const holdingModules = [
    'operations', 'shipments', 'containers', 'maritime', 'rail', 'road',
    'aviation', 'terminal', 'yard', 'warehouse', 'assets', 'maintenance',
    'workforce', 'planning', 'billing', 'analytics', 'intermodal', 'group_dashboard',
  ]

  const maritimeModules = [
    'operations', 'shipments', 'containers', 'maritime', 'terminal',
    'yard', 'assets', 'maintenance', 'workforce', 'analytics', 'billing', 'intermodal',
  ]

  await db.insert(orgModuleAccess).values([
    ...holdingModules.map(m => ({
      orgId: HOLDING_ID,
      moduleKey: m,
      enabled: true,
      grantedBy: ADMIN_USER_ID,
    })),
    ...maritimeModules.map(m => ({
      orgId: MARITIME_ID,
      moduleKey: m,
      enabled: true,
      grantedBy: ADMIN_USER_ID,
    })),
  ]).onConflictDoNothing()

  logger.info('Module access seeded')

  // ─────────────────────────────────────────
  // Geospatial seed (Phase 5)
  // Tanjung Priok terminal zone + Cikarang warehouse zone
  // ─────────────────────────────────────────
  const priokGeofenceId = '01ARZ3NDEKTSV4RRFFQ69G5KLG'
  const cikarangGeofenceId = '01ARZ3NDEKTSV4RRFFQ69G5LMH'

  await db.insert(geofences).values([
    {
      id: priokGeofenceId,
      name: 'Tanjung Priok Terminal Zone',
      geofenceType: 'TERMINAL',
      boundary: 'POLYGON((106.87 -6.10, 106.91 -6.10, 106.91 -6.12, 106.87 -6.12, 106.87 -6.10))',
      status: 'ACTIVE',
    },
    {
      id: cikarangGeofenceId,
      name: 'Cikarang Warehouse Zone',
      geofenceType: 'WAREHOUSE',
      boundary: 'POLYGON((107.12 -6.28, 107.16 -6.28, 107.16 -6.31, 107.12 -6.31, 107.12 -6.28))',
      status: 'ACTIVE',
    },
  ]).onConflictDoNothing()

  logger.info('Geofences seeded')

  // ─────────────────────────────────────────
  // Road domain seed — vehicles, route, positions
  // ─────────────────────────────────────────
  const truckAId = '01ARZ3NDEKTSV4RRFFQ69G5MNI'
  const truckBId = '01ARZ3NDEKTSV4RRFFQ69G5NOJ'

  await db.insert(vehicles).values([
    {
      id: truckAId,
      orgId: ROAD_ID,
      plateNumber: 'B 1234 XCD',
      type: 'TRUCK',
      status: 'ON_TRIP',
    },
    {
      id: truckBId,
      orgId: ROAD_ID,
      plateNumber: 'B 5678 ZAB',
      type: 'TRUCK',
      status: 'AVAILABLE',
    },
  ]).onConflictDoNothing()

  logger.info('Road vehicles seeded')

  const priokToCikarangRouteId = '01ARZ3NDEKTSV4RRFFQ69G5OPK'
  await db.insert(routes).values({
    id: priokToCikarangRouteId,
    orgId: ROAD_ID,
    origin: 'POINT(106.89 -6.11)',
    destination: 'POINT(107.14 -6.30)',
    geometry: 'LINESTRING(106.89 -6.11, 107.00 -6.20, 107.14 -6.30)',
    distanceKm: '42.5',
    estimatedDurationMinutes: 55,
    routeType: 'HIGHWAY',
  }).onConflictDoNothing()

  logger.info('Road route seeded')

  // truckA inside Priok zone, truckB outside (near Cikarang)
  await db.insert(vehiclePositions).values([
    {
      id: '01ARZ3NDEKTSV4RRFFQ69G5PQL',
      vehicleId: truckAId,
      position: 'POINT(106.89 -6.11)',
      recordedAt: new Date(),
    },
    {
      id: '01ARZ3NDEKTSV4RRFFQ69G5QRM',
      vehicleId: truckBId,
      position: 'POINT(107.15 -6.29)',
      recordedAt: new Date(),
    },
  ]).onConflictDoNothing()

  logger.info('Vehicle positions seeded')
  logger.info('Seed completed successfully')
  logger.info('─────────────────────────────────')
  logger.info('Seed credentials:')
  logger.info('  Holding Admin  → admin@nexusops.io / Admin@123456')
  logger.info('  Maritime Ops   → ops@pelayaran.nexusops.io / Maritime@123456')
  logger.info('─────────────────────────────────')
}

seed().catch(err => {
  logger.error('Seed failed', { error: String(err) })
  process.exit(1)
})
