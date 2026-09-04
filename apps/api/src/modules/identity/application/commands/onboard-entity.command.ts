import { db } from '@/shared/database/client'
import { organizations, orgModuleAccess, roles } from '@/shared/database/schema/identity'
import { eq, and, isNull } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { ForbiddenError, NotFoundError } from '@/shared/errors'
import { DEFAULT_ROLES, getModuleBundleForEntityType } from '@/modules/identity/domain/entities/module-bundles'
import type { MODULE_BUNDLES } from '@/modules/identity/domain/entities/module-bundles'
import type { AuthUser } from '@/shared/auth/middleware'
import type { entityTypeEnum } from '@/shared/database/schema/identity'

type EntityTypeValue = typeof entityTypeEnum.enumValues[number]

// ─────────────────────────────────────────
// Types
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
  org: { id: string; name: string; slug: string; entityType: string; holdingId: string }
  modulesGranted: string[]
  rolesCreated: string[]
}

// ─────────────────────────────────────────
// Handler
// ─────────────────────────────────────────

export async function onboardEntityCommand(
  cmd: OnboardEntityCommand
): Promise<OnboardEntityResult> {
  if (cmd.actor.entityType !== 'HOLDING') {
    throw new ForbiddenError('Only Holding entity can onboard new entities.')
  }

  const [holdingOrg] = await db
    .select()
    .from(organizations)
    .where(and(eq(organizations.id, cmd.holdingOrgId), isNull(organizations.deletedAt)))
    .limit(1)

  if (!holdingOrg) throw new NotFoundError('Organization', cmd.holdingOrgId)

  const hierarchyPath = holdingOrg.hierarchyPath
    ? `${holdingOrg.hierarchyPath}.${cmd.slug.replace(/-/g, '_')}`
    : cmd.slug.replace(/-/g, '_')

  const orgId = generateId()
  await db.insert(organizations).values({
    id: orgId,
    parentOrgId: cmd.holdingOrgId,
    hierarchyPath,
    name: cmd.name,
    slug: cmd.slug,
    entityType: cmd.entityType as EntityTypeValue,
    status: 'ACTIVE',
    timezone: cmd.timezone ?? 'Asia/Jakarta',
    currency: cmd.currency ?? 'IDR',
  })

  const modules = getModuleBundleForEntityType(cmd.entityType)
  await db.insert(orgModuleAccess).values(
    modules.map(moduleKey => ({ orgId, moduleKey, enabled: true, grantedBy: cmd.actor.id }))
  )

  const defaultRoles = DEFAULT_ROLES[cmd.entityType] ?? []
  if (defaultRoles.length > 0) {
    await db.insert(roles).values(
      defaultRoles.map(r => ({ id: generateId(), orgId, name: r.name, description: r.description, isSystem: true }))
    )
  }

  return {
    org: { id: orgId, name: cmd.name, slug: cmd.slug, entityType: cmd.entityType, holdingId: cmd.holdingOrgId },
    modulesGranted: modules,
    rolesCreated: defaultRoles.map(r => r.name),
  }
}
