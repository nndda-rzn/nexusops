import { db } from '@/shared/database/client'
import {
  organizations,
  orgMembers,
  orgModuleAccess,
  roles,
} from '@/shared/database/schema/identity'
import { eq, and, isNull } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { NotFoundError, ForbiddenError } from '@/shared/errors'
import { MODULE_BUNDLES, DEFAULT_ROLES, getModuleBundleForEntityType } from '@/modules/identity/domain/entities/module-bundles'
import type { AuthUser } from '@/shared/auth/middleware'

// ─────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────

export interface OnboardEntityCommand {
  holdingOrgId: string
  name: string
  slug: string
  entityType: keyof typeof MODULE_BUNDLES
  timezone?: string | undefined
  currency?: string | undefined
  actor: AuthUser
}

export interface OnboardEntityResult {
  org: {
    id: string
    name: string
    slug: string
    entityType: string
    holdingId: string
  }
  modulesGranted: string[]
  rolesCreated: string[]
}

export interface GetEntityModulesQuery {
  orgId: string
}

// ─────────────────────────────────────────
// Onboard Entity Command Handler
// Creates a new entity org under Holding with module bundle + default roles
// ─────────────────────────────────────────

export async function onboardEntityHandler(
  command: OnboardEntityCommand
): Promise<OnboardEntityResult> {
  // 1. Verify actor is Holding
  if (command.actor.entityType !== 'HOLDING') {
    throw new ForbiddenError('Only Holding entity can onboard new entities.')
  }

  // 2. Verify holding org exists
  const [holdingOrg] = await db
    .select()
    .from(organizations)
    .where(and(
      eq(organizations.id, command.holdingOrgId),
      isNull(organizations.deletedAt),
    ))
    .limit(1)

  if (!holdingOrg) throw new NotFoundError('Organization', command.holdingOrgId)

  // 3. Build hierarchy path
  const hierarchyPath = holdingOrg.hierarchyPath
    ? `${holdingOrg.hierarchyPath}.${command.slug.replace(/-/g, '_')}`
    : command.slug.replace(/-/g, '_')

  // 4. Create org
  const orgId = generateId()
  await db.insert(organizations).values({
    id: orgId,
    parentOrgId: command.holdingOrgId,
    hierarchyPath,
    name: command.name,
    slug: command.slug,
    entityType: command.entityType as any,
    status: 'ACTIVE',
    timezone: command.timezone ?? 'Asia/Jakarta',
    currency: command.currency ?? 'IDR',
  })

  // 5. Grant module bundle
  const modules = getModuleBundleForEntityType(command.entityType)
  const moduleEntries = modules.map(moduleKey => ({
    orgId,
    moduleKey,
    enabled: true,
    grantedBy: command.actor.id,
  }))

  await db.insert(orgModuleAccess).values(moduleEntries)

  // 6. Create default roles
  const defaultRoles = DEFAULT_ROLES[command.entityType] ?? []
  const roleEntries = defaultRoles.map(r => ({
    id: generateId(),
    orgId,
    name: r.name,
    description: r.description,
    isSystem: true,
  }))

  if (roleEntries.length > 0) {
    await db.insert(roles).values(roleEntries)
  }

  return {
    org: {
      id: orgId,
      name: command.name,
      slug: command.slug,
      entityType: command.entityType,
      holdingId: command.holdingOrgId,
    },
    modulesGranted: modules,
    rolesCreated: defaultRoles.map(r => r.name),
  }
}

// ─────────────────────────────────────────
// Get Entity Modules Query
// Returns all enabled modules for an org
// ─────────────────────────────────────────

export async function getEntityModulesHandler(
  query: GetEntityModulesQuery
): Promise<string[]> {
  const moduleRows = await db
    .select({ moduleKey: orgModuleAccess.moduleKey })
    .from(orgModuleAccess)
    .where(and(
      eq(orgModuleAccess.orgId, query.orgId),
      eq(orgModuleAccess.enabled, true)
    ))

  return moduleRows.map(r => r.moduleKey)
}

// ─────────────────────────────────────────
// List Entities Query (for Holding)
// Returns all child entities under a holding
// ─────────────────────────────────────────

export async function listEntitiesHandler(holdingOrgId: string) {
  const entities = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      entityType: organizations.entityType,
      status: organizations.status,
      createdAt: organizations.createdAt,
    })
    .from(organizations)
    .where(and(
      eq(organizations.parentOrgId, holdingOrgId),
      isNull(organizations.deletedAt),
    ))

  return entities
}
