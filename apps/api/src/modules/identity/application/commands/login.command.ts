import { db } from '@/shared/database/client'
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
import { verifyPassword, hashPassword } from '@/shared/auth/password'
import { signJwt } from '@/shared/auth/jwt'
import { generateId } from '@/shared/ids'
import { env } from '@/shared/config/env'
import { logger } from '@/shared/logging'
import { parseExpiry } from '@/shared/auth/jwt.utils'
import {
  InvalidCredentialsError,
  UserSuspendedError,
  OrgSuspendedError,
} from '@/modules/identity/domain/errors/auth.errors'
import type { JwtPayload } from '@/shared/auth/jwt.types'

// ─────────────────────────────────────────
// Types
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
  user: { id: string; name: string; email: string }
  org: { id: string; name: string; entityType: string }
}

// ─────────────────────────────────────────
// Handler
// ─────────────────────────────────────────

export async function loginCommand(cmd: LoginCommand): Promise<LoginResult> {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, cmd.email), isNull(users.deletedAt)))
    .limit(1)

  const validPassword = user
    ? await verifyPassword(cmd.password, user.passwordHash).catch(() => false)
    : false

  if (!user || !validPassword) {
    await db.insert(loginHistory).values({
      id: generateId(), userId: user?.id, orgId: cmd.orgId,
      entityType: null, ipAddress: cmd.ipAddress,
      userAgent: cmd.userAgent, status: 'FAILED',
    }).catch(() => {})
    throw new InvalidCredentialsError()
  }

  if (user.status === 'SUSPENDED') throw new UserSuspendedError()
  if (user.status === 'INACTIVE') throw new InvalidCredentialsError()

  const memberships = await db
    .select({ member: orgMembers, role: roles, org: organizations })
    .from(orgMembers)
    .innerJoin(roles, eq(roles.id, orgMembers.roleId))
    .innerJoin(organizations, eq(organizations.id, orgMembers.orgId))
    .where(and(eq(orgMembers.userId, user.id), isNull(organizations.deletedAt)))

  if (memberships.length === 0) throw new InvalidCredentialsError()

  let target = memberships[0]!
  if (cmd.orgId) {
    const found = memberships.find(m => m.org.id === cmd.orgId)
    if (!found) throw new InvalidCredentialsError()
    target = found
  }

  const { org, role } = target
  if (org.status === 'SUSPENDED') throw new OrgSuspendedError()
  if (org.status === 'INACTIVE') throw new InvalidCredentialsError()

  const moduleRows = await db
    .select({ moduleKey: orgModuleAccess.moduleKey })
    .from(orgModuleAccess)
    .where(and(eq(orgModuleAccess.orgId, org.id), eq(orgModuleAccess.enabled, true)))

  const modules = moduleRows.map(r => r.moduleKey)
  const holdingId = org.entityType === 'HOLDING' ? org.id : (org.parentOrgId ?? org.id)

  const payload: Omit<JwtPayload, 'jti' | 'iat' | 'exp'> = {
    sub: user.id, org_id: org.id, entity_type: org.entityType,
    role: role.name,
    permissions: org.entityType === 'HOLDING' ? ['*'] : [],
    modules: org.entityType === 'HOLDING' ? ['*'] : modules,
    holding_id: holdingId,
  }

  const { accessToken, expiresIn } = await signJwt(payload)
  const refreshTokenValue = generateId() + generateId() + generateId()
  const tokenPrefix = refreshTokenValue.substring(0, 8)  // S-05 FIX: store prefix for fast lookup
  const refreshExpiresAt = new Date(Date.now() + parseExpiry(env.JWT_REFRESH_EXPIRES_IN) * 1000)

  await db.insert(refreshTokens).values({
    id: generateId(), userId: user.id, orgId: org.id,
    tokenPrefix,                                          // ← prefix stored
    tokenHash: await hashPassword(refreshTokenValue),
    expiresAt: refreshExpiresAt,
    ipAddress: cmd.ipAddress, userAgent: cmd.userAgent,
  })

  await Promise.allSettled([
    db.insert(loginHistory).values({
      id: generateId(), userId: user.id, orgId: org.id,
      entityType: org.entityType, ipAddress: cmd.ipAddress,
      userAgent: cmd.userAgent, status: 'SUCCESS',
    }),
    db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id)),
  ])

  logger.info('User logged in', { user_id: user.id, org_id: org.id, entity_type: org.entityType })

  return {
    accessToken, refreshToken: refreshTokenValue, expiresIn,
    user: { id: user.id, name: user.name, email: user.email },
    org: { id: org.id, name: org.name, entityType: org.entityType },
  }
}
