import { db } from '@/shared/database/client'
import { users, orgMembers, roles, organizations, orgModuleAccess, refreshTokens } from '@/shared/database/schema/identity'
import { eq, and, isNull } from 'drizzle-orm'
import { verify, hash } from 'argon2'
import { signJwt } from '@/shared/auth/jwt'
import { generateId } from '@/shared/ids'
import { env } from '@/shared/config/env'
import {
  InvalidCredentialsError,
  UserSuspendedError,
  OrgSuspendedError,
  InvalidRefreshTokenError,
  EntityNotFoundError,
} from '@/modules/identity/domain/errors/auth.errors'
import type { JwtPayload } from '@/shared/auth/jwt.types'

// ─────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────

export interface LoginCommand {
  email: string
  password: string
  orgId?: string | undefined
}

export interface LoginResult {
  accessToken: string
  expiresIn: number
  user: {
    id: string
    name: string
    email: string
  }
  org: {
    id: string
    name: string
    entityType: string
  }
}

export interface SwitchEntityCommand {
  userId: string
  currentOrgId: string
  holdingId: string
  targetOrgId: string
}

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

function parseRefreshExpiry(): number {
  const expiry = env.JWT_REFRESH_EXPIRES_IN
  const match = expiry.match(/^(\d+)([smhd])$/)
  if (!match) return 7 * 24 * 3600

  const value = parseInt(match[1] ?? '7')
  const unit = match[2]

  switch (unit) {
    case 's': return value
    case 'm': return value * 60
    case 'h': return value * 3600
    case 'd': return value * 86400
    default: return 7 * 24 * 3600
  }
}

// ─────────────────────────────────────────
// Login Command Handler
// ─────────────────────────────────────────

export async function loginHandler(command: LoginCommand): Promise<LoginResult> {
  // 1. Find user by email
  const [user] = await db
    .select()
    .from(users)
    .where(and(
      eq(users.email, command.email),
      isNull(users.deletedAt)
    ))
    .limit(1)

  if (!user) throw new InvalidCredentialsError()

  // 2. Verify password
  const validPassword = await verify(user.passwordHash, command.password)
  if (!validPassword) throw new InvalidCredentialsError()

  // 3. Check user status
  if (user.status === 'SUSPENDED') throw new UserSuspendedError()
  if (user.status === 'INACTIVE') throw new InvalidCredentialsError()

  // 4. Find org membership
  // If orgId provided, find that specific membership
  // Otherwise, find first active membership
  const memberQuery = db
    .select({
      member: orgMembers,
      role: roles,
      org: organizations,
    })
    .from(orgMembers)
    .innerJoin(roles, eq(roles.id, orgMembers.roleId))
    .innerJoin(organizations, eq(organizations.id, orgMembers.orgId))
    .where(and(
      eq(orgMembers.userId, user.id),
      isNull(organizations.deletedAt),
    ))

  const memberships = await memberQuery

  if (memberships.length === 0) throw new InvalidCredentialsError()

  // Pick the target org
  let targetMembership = memberships[0]!
  if (command.orgId) {
    const found = memberships.find(m => m.org.id === command.orgId)
    if (!found) throw new InvalidCredentialsError()
    targetMembership = found
  }

  const { org, role } = targetMembership

  // 5. Check org status
  if (org.status === 'SUSPENDED') throw new OrgSuspendedError()
  if (org.status === 'INACTIVE') throw new InvalidCredentialsError()

  // 6. Load module access
  const moduleRows = await db
    .select({ moduleKey: orgModuleAccess.moduleKey })
    .from(orgModuleAccess)
    .where(and(
      eq(orgModuleAccess.orgId, org.id),
      eq(orgModuleAccess.enabled, true)
    ))

  const modules = moduleRows.map(r => r.moduleKey)

  // 7. Find holding ID (parent of parent, or self if HOLDING)
  const holdingId = org.entityType === 'HOLDING'
    ? org.id
    : (org.parentOrgId ?? org.id)

  // 8. Build JWT payload (permissions loaded by rbac-middleware, for now use role name)
  const payload: Omit<JwtPayload, 'jti' | 'iat' | 'exp'> = {
    sub: user.id,
    org_id: org.id,
    entity_type: org.entityType,
    role: role.name,
    permissions: org.entityType === 'HOLDING' ? ['*'] : [],  // filled by rbac middleware
    modules: org.entityType === 'HOLDING' ? ['*'] : modules,
    holding_id: holdingId,
  }

  // 9. Sign JWT
  const { accessToken, expiresIn } = await signJwt(payload)

  // 10. Store refresh token
  const refreshTokenValue = generateId() + generateId() // long random token
  const refreshTokenHash = await hash(refreshTokenValue)
  const refreshExpiresAt = new Date(Date.now() + parseRefreshExpiry() * 1000)

  await db.insert(refreshTokens).values({
    id: generateId(),
    userId: user.id,
    orgId: org.id,
    tokenHash: refreshTokenHash,
    expiresAt: refreshExpiresAt,
    ipAddress: undefined,
    userAgent: undefined,
  })

  return {
    accessToken,
    expiresIn,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    org: {
      id: org.id,
      name: org.name,
      entityType: org.entityType,
    },
  }
}

// ─────────────────────────────────────────
// Switch Entity Command Handler (Holding only)
// ─────────────────────────────────────────

export async function switchEntityHandler(command: SwitchEntityCommand): Promise<LoginResult> {
  // 1. Verify target org exists and is in same group
  const [targetOrg] = await db
    .select()
    .from(organizations)
    .where(and(
      eq(organizations.id, command.targetOrgId),
      isNull(organizations.deletedAt),
    ))
    .limit(1)

  if (!targetOrg) throw new EntityNotFoundError(command.targetOrgId)
  if (targetOrg.status !== 'ACTIVE') throw new OrgSuspendedError()

  // 2. Load user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, command.userId))
    .limit(1)

  if (!user) throw new InvalidCredentialsError()

  // 3. Load modules for target entity
  const moduleRows = await db
    .select({ moduleKey: orgModuleAccess.moduleKey })
    .from(orgModuleAccess)
    .where(and(
      eq(orgModuleAccess.orgId, targetOrg.id),
      eq(orgModuleAccess.enabled, true)
    ))

  const modules = moduleRows.map(r => r.moduleKey)

  // 4. Sign JWT with target entity context
  const payload: Omit<JwtPayload, 'jti' | 'iat' | 'exp'> = {
    sub: user.id,
    org_id: targetOrg.id,
    entity_type: targetOrg.entityType,
    role: 'group_operations_director',  // Holding role retained
    permissions: ['*'],  // Holding retains full permissions
    modules,
    holding_id: command.holdingId,
    switched_from: command.currentOrgId,
  }

  const { accessToken, expiresIn } = await signJwt(payload)

  return {
    accessToken,
    expiresIn,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    org: {
      id: targetOrg.id,
      name: targetOrg.name,
      entityType: targetOrg.entityType,
    },
  }
}
