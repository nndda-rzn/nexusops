// ─────────────────────────────────────────
// Module bundles per entity type
// Defines which modules are available for each entity type
// ─────────────────────────────────────────

export const MODULE_BUNDLES: Record<string, string[]> = {
  HOLDING: [
    'operations', 'shipments', 'containers', 'maritime', 'rail', 'road',
    'aviation', 'terminal', 'yard', 'warehouse', 'assets', 'maintenance',
    'workforce', 'planning', 'billing', 'analytics', 'intermodal', 'group_dashboard',
  ],
  MARITIME: [
    'operations', 'shipments', 'containers', 'maritime', 'terminal',
    'yard', 'assets', 'maintenance', 'workforce', 'analytics', 'billing', 'intermodal',
  ],
  RAIL: [
    'operations', 'shipments', 'rail',
    'assets', 'maintenance', 'workforce', 'analytics', 'billing', 'intermodal',
  ],
  ROAD: [
    'operations', 'shipments', 'road',
    'assets', 'maintenance', 'workforce', 'analytics', 'billing', 'intermodal',
  ],
  WAREHOUSE: [
    'operations', 'shipments', 'warehouse',
    'assets', 'analytics', 'billing', 'intermodal',
  ],
  AVIATION: [
    'operations', 'shipments', 'aviation',
    'assets', 'maintenance', 'workforce', 'analytics', 'billing', 'intermodal',
  ],
}

// ─────────────────────────────────────────
// Default roles per entity type
// ─────────────────────────────────────────

export const DEFAULT_ROLES: Record<string, Array<{ name: string; description: string }>> = {
  HOLDING: [
    { name: 'platform_admin', description: 'Full system access' },
    { name: 'group_operations_director', description: 'Observe and intervene all entities' },
    { name: 'group_analyst', description: 'Read-only access to all entities' },
    { name: 'group_planner', description: 'Planning and optimization access' },
    { name: 'holding_auditor', description: 'Audit trail access for all entities' },
  ],
  MARITIME: [
    { name: 'operations_manager', description: 'All operations within entity' },
    { name: 'terminal_manager', description: 'Terminal and berth management' },
    { name: 'yard_planner', description: 'Yard and slot management' },
    { name: 'maintenance_manager', description: 'Work orders and maintenance' },
    { name: 'analyst', description: 'Read-only analytics' },
    { name: 'auditor', description: 'Read-only audit trail' },
  ],
  RAIL: [
    { name: 'operations_manager', description: 'All rail operations' },
    { name: 'train_operator', description: 'Train scheduling and platform' },
    { name: 'crew_manager', description: 'Crew assignment' },
    { name: 'maintenance_manager', description: 'Asset and work orders' },
    { name: 'analyst', description: 'Read-only analytics' },
  ],
  ROAD: [
    { name: 'operations_manager', description: 'All road operations' },
    { name: 'dispatcher', description: 'Trip dispatch and tracking' },
    { name: 'fleet_manager', description: 'Fleet and driver management' },
    { name: 'driver', description: 'Own assigned trips only' },
    { name: 'analyst', description: 'Read-only analytics' },
  ],
  WAREHOUSE: [
    { name: 'operations_manager', description: 'All warehouse operations' },
    { name: 'warehouse_operator', description: 'Receiving, putaway, picking, dispatch' },
    { name: 'inventory_manager', description: 'Inventory and cycle count' },
    { name: 'analyst', description: 'Read-only analytics' },
  ],
  AVIATION: [
    { name: 'operations_manager', description: 'All aviation operations' },
    { name: 'load_planner', description: 'Cargo manifest and load plan' },
    { name: 'ground_handler', description: 'Ground handling' },
    { name: 'analyst', description: 'Read-only analytics' },
  ],
}

/**
 * Get module bundle for entity type
 * Returns ['*'] for HOLDING (wildcard access)
 */
export function getModuleBundleForEntityType(entityType: string): string[] {
  if (entityType === 'HOLDING') return ['*']
  return MODULE_BUNDLES[entityType] ?? []
}

/**
 * Check if entity type has access to a module
 */
export function entityTypeHasModule(entityType: string, module: string): boolean {
  if (entityType === 'HOLDING') return true
  const bundle = MODULE_BUNDLES[entityType]
  return bundle?.includes(module) ?? false
}
