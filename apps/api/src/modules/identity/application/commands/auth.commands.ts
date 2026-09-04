import { db, withRequestContext } from '@/shared/database/client'
import {
  users,
  orgMembers,
  roles,
  organizations,
  orgModuleAccess,
  refreshTokens,
  loginHistory,
} from '@/shared/database/schema/identity'
import { eq, and, isNull } from 'drizzle-orm'
import { verify, hash } from 'argon2'
import { signJwt } from '@/shared/auth/jwt'
import { generateId } from '@/shared/ids'
import { env } from '@/shared/config/env'
import { logger } from '@/shared/logging'
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
  ipAddress?: string | undefined
  userAgent?: string | undefined
}

export interface LoginResult {
  accessToken: string
  refreshToken: string
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

export interface RefreshTokenCommand {
  refreshToken: string
  ipAddress?: string | undefined
  userAgent?: string | undefined
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
  // 1. Find user by email (no RLS context needed — public lookup)
  const [user] = await db
    .select()
    .from(users)
    .where(and(
      eq(users.email, command.email),
      isNull(users.deletedAt)
    ))
    .limit(1)

  // 2. Verify password (do this before status check to prevent timing attacks)
  const validPassword = user
    ? await verify(user.passwordHash, command.password).catch(() => false)
    : false

  if (!user || !validPassword) {
    // Log failed attempt
    await db.insert(loginHistory).values({
      id: generateId(),
      userId: user?.id,
      orgId: command.orgId,
      entityType: null,
      ipAddress: command.ipAddress,
      userAgent: command.userAgent,
      status: 'FAILED',
    }).catch(() => {}) // non-blocking

    throw new InvalidCredentialsError()
  }

  // 3. Check user status
  if (user.status === 'SUSPENDED') throw new UserSuspendedError()
  if (user.status === 'INACTIVE') throw new InvalidCredentialsError()

  // 4. Find org membership — no RLS needed, using direct DB query
  const memberships = await db
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

  if (memberships.length === 0) throw new InvalidCredentialsError()

  // Pick target org
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

  // 7. Find holding ID
  const holdingId = org.entityType === 'HOLDING'
    ? org.id
    : (org.parentOrgId ?? org.id)

  // 8. Build JWT payload
  const payload: Omit<JwtPayload, 'jti' | 'iat' | 'exp'> = {
    sub: user.id,
    org_id: org.id,
    entity_type: org.entityType,
    role: role.name,
    permissions: org.entityType === 'HOLDING' ? ['*'] : [],
    modules: org.entityType === 'HOLDING' ? ['*'] : modules,
    holding_id: holdingId,
  }

  // 9. Sign access token
  const { accessToken, expiresIn } = await signJwt(payload)

  // 10. Generate and store refresh token
  const refreshTokenValue = generateId() + generateId() + generateId()
  const refreshTokenHash = await hash(refreshTokenValue)
  const refreshExpiresAt = new Date(Date.now() + parseRefreshExpiry() * 1000)

  await db.insert(refreshTokens).values({
    id: generateId(),
    userId: user.id,
    orgId: org.id,
    tokenHash: refreshTokenHash,
    expiresAt: refreshExpiresAt,
    ipAddress: command.ipAddress,
    userAgent: command.userAgent,
  })

  // 11. Log successful login
  await db.insert(loginHistory).values({
    id: generateId(),
    userId: user.id,
    orgId: org.id,
    entityType: org.entityType,
    ipAddress: command.ipAddress,
    userAgent: command.userAgent,
    status: 'SUCCESS',
  }).catch(() => {}) // non-blocking

  // 12. Update last login timestamp
  await db.update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id))
    .catch(() => {}) // non-blocking

  logger.info('User logged in', {
    user_id: user.id,
    org_id: org.id,
    entity_type: org.entityType,
  })

  return {
    accessToken,
    refreshToken: refreshTokenValue,
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
// Refresh Token Handler
// ─────────────────────────────────────────

export async function refreshTokenHandler(command: RefreshTokenCommand): Promise<{ accessToken: string; expiresIn: number }> {
  // Load all non-revoked, non-expired tokens and find matching one
  const tokenRows = await db
    .select()
    .from(refreshTokens)
    .where(and(
      isNull(refreshTokens.revokedAt),
      // expires_at > now is checked in application layer
    ))
    .limit(100)

  let matchedToken = null
  for (const row of tokenRows) {
    if (row.expiresAt < new Date()) continue
    const matches = await verify(row.tokenHash, command.refreshToken).catch(() => false)
    if (matches) {
      matchedToken = row
      break
    }
  }

  if (!matchedToken) throw new InvalidRefreshTokenError()

  // Revoke used refresh token (rotation)
  await db.update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, matchedToken.id))

  // Load user and org
  const [user] = await db.select().from(users)
    .where(eq(users.id, matchedToken.userId)).limit(1)

  const [org] = await db.select().from(organizations)
    .where(eq(organizations.id, matchedToken.orgId)).limit(1)

  if (!user || !org) throw new InvalidRefreshTokenError()
  if (user.status !== 'ACTIVE') throw new InvalidRefreshTokenError()
  if (org.status !== 'ACTIVE') throw new InvalidRefreshTokenError()

  // Load modules
  const moduleRows = await db
    .select({ moduleKey: orgModuleAccess.moduleKey })
    .from(orgModuleAccess)
    .where(and(
      eq(orgModuleAccess.orgId, org.id),
      eq(orgModuleAccess.enabled, true)
    ))

  const modules = moduleRows.map(r => r.moduleKey)
  const holdingId = org.entityType === 'HOLDING' ? org.id : (org.parentOrgId ?? org.id)

  // Load role
  const [memberRow] = await db.select({ role: roles })
    .from(orgMembers)
    .innerJoin(roles, eq(roles.id, orgMembers.roleId))
    .where(and(
      eq(orgMembers.userId, user.id),
      eq(orgMembers.orgId, org.id),
    ))
    .limit(1)

  const roleName = memberRow?.role.name ?? 'user'

  const payload: Omit<JwtPayload, 'jti' | 'iat' | 'exp'> = {
    sub: user.id,
    org_id: org.id,
    entity_type: org.entityType,
    role: roleName,
    permissions: org.entityType === 'HOLDING' ? ['*'] : [],
    modules: org.entityType === 'HOLDING' ? ['*'] : modules,
    holding_id: holdingId,
  }

  const { accessToken, expiresIn } = await signJwt(payload)

  return { accessToken, expiresIn }
}

// ─────────────────────────────────────────
// Switch Entity Handler (Holding only)
// ─────────────────────────────────────────

export async function switchEntityHandler(command: SwitchEntityCommand): Promise<LoginResult> {
  // 1. Verify target org exists AND is within the same holding group
  const [targetOrg] = await db
    .select()
    .from(organizations)
    .where(and(
      eq(organizations.id, command.targetOrgId),
      eq(organizations.parentOrgId, command.holdingId), // MUST be child of same holding
      isNull(organizations.deletedAt),
    ))
    .limit(1)

  if (!targetOrg) throw new EntityNotFoundError(command.targetOrgId)
  if (targetOrg.status !== 'ACTIVE') throw new OrgSuspendedError()

  // 2. Load user
  const [user] = await db.select().from(users)
    .where(eq(users.id, command.userId)).limit(1)

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

  // 4. Sign JWT with target entity context (Holding retains full permissions)
  const payload: Omit<JwtPayload, 'jti' | 'iat' | 'exp'> = {
    sub: user.id,
    org_id: targetOrg.id,
    entity_type: targetOrg.entityType,
    role: 'group_operations_director',
    permissions: ['*'],
    modules,
    holding_id: command.holdingId,
    switched_from: command.currentOrgId,
  }

  const { accessToken, expiresIn } = await signJwt(payload)

  // Generate refresh token for switched context
  const refreshTokenValue = generateId() + generateId() + generateId()
  const refreshTokenHash = await hash(refreshTokenValue)
  const refreshExpiresAt = new Date(Date.now() + parseRefreshExpiry() * 1000)

  await db.insert(refreshTokens).values({
    id: generateId(),
    userId: user.id,
    orgId: targetOrg.id,
    tokenHash: refreshTokenHash,
    expiresAt: refreshExpiresAt,
  })

  return {
    accessToken,
    refreshToken: refreshTokenValue,
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
