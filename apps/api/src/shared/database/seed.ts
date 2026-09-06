import { db } from '@/shared/database/client'
import { organizations, users, roles, permissions, rolePermissions, orgMembers, orgModuleAccess } from '@/shared/database/schema/identity'
import { geofences } from '@/shared/database/schema/shared-master'
import { vehicles, routes, vehiclePositions } from '@/shared/database/schema/road'
import { generateId } from '@/shared/ids'
import { logger } from '@/shared/logging'
import { hashPassword } from '@/shared/auth/password'

// ─────────────────────────────────────────
// Seed data
// ─────────────────────────────────────────

const HOLDING_ID = generateId()
const MARITIME_ID = generateId()
const RAIL_ID = generateId()
const ROAD_ID = generateId()
const WAREHOUSE_ID = generateId()

const ADMIN_USER_ID = generateId()
const MARITIME_ADMIN_ID = generateId()

async function seed() {
  logger.info('Starting database seed...')

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
  const HOLDING_ADMIN_ROLE_ID = generateId()
  const MARITIME_OPS_ROLE_ID = generateId()

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
      id: generateId(),
      orgId: HOLDING_ID,
      userId: ADMIN_USER_ID,
      roleId: HOLDING_ADMIN_ROLE_ID,
    },
    {
      id: generateId(),
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
  const priokGeofenceId = generateId()
  const cikarangGeofenceId = generateId()

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
  const truckAId = generateId()
  const truckBId = generateId()

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

  const priokToCikarangRouteId = generateId()
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
      id: generateId(),
      vehicleId: truckAId,
      position: 'POINT(106.89 -6.11)',
      recordedAt: new Date(),
    },
    {
      id: generateId(),
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
