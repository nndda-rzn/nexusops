import { db } from '@/shared/database/client'
import {
  users,
  organizations,
  orgModuleAccess,
  refreshTokens,
  orgMembers,
  roles,
} from '@/shared/database/schema/identity'
import { eq, and, isNull } from 'drizzle-orm'
import { verify } from 'argon2'
import { signJwt } from '@/shared/auth/jwt'
import { InvalidRefreshTokenError } from '@/modules/identity/domain/errors/auth.errors'
import type { JwtPayload } from '@/shared/auth/jwt.types'

export interface RefreshTokenCommand {
  refreshToken: string
  ipAddress?: string | undefined
  userAgent?: string | undefined
}

export interface RefreshTokenResult {
  accessToken: string
  expiresIn: number
}

export async function refreshTokenCommand(
  cmd: RefreshTokenCommand
): Promise<RefreshTokenResult> {
  // S-05 FIX: lookup by token prefix (8 chars) — O(1) instead of O(n)
  const tokenPrefix = cmd.refreshToken.substring(0, 8)

  const [tokenRow] = await db
    .select()
    .from(refreshTokens)
    .where(and(
      eq(refreshTokens.tokenPrefix, tokenPrefix),  // ← fast index lookup
      isNull(refreshTokens.revokedAt),
    ))
    .limit(1)

  if (!tokenRow) throw new InvalidRefreshTokenError()
  if (tokenRow.expiresAt < new Date()) throw new InvalidRefreshTokenError()

  // Verify argon2 hash — only 1 row now, not N rows
  const isValid = await verify(tokenRow.tokenHash, cmd.refreshToken).catch(() => false)
  if (!isValid) throw new InvalidRefreshTokenError()

  // Revoke used refresh token (rotation)
  await db.update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, tokenRow.id))

  const [user] = await db.select().from(users)
    .where(eq(users.id, tokenRow.userId)).limit(1)
  const [org] = await db.select().from(organizations)
    .where(eq(organizations.id, tokenRow.orgId)).limit(1)

  if (!user || !org) throw new InvalidRefreshTokenError()
  if (user.status !== 'ACTIVE') throw new InvalidRefreshTokenError()
  if (org.status !== 'ACTIVE') throw new InvalidRefreshTokenError()

  const moduleRows = await db
    .select({ moduleKey: orgModuleAccess.moduleKey })
    .from(orgModuleAccess)
    .where(and(eq(orgModuleAccess.orgId, org.id), eq(orgModuleAccess.enabled, true)))

  const modules = moduleRows.map(r => r.moduleKey)
  const holdingId = org.entityType === 'HOLDING' ? org.id : (org.parentOrgId ?? org.id)

  const [memberRow] = await db.select({ role: roles })
    .from(orgMembers)
    .innerJoin(roles, eq(roles.id, orgMembers.roleId))
    .where(and(eq(orgMembers.userId, user.id), eq(orgMembers.orgId, org.id)))
    .limit(1)

  const payload: Omit<JwtPayload, 'jti' | 'iat' | 'exp'> = {
    sub: user.id, org_id: org.id, entity_type: org.entityType,
    role: memberRow?.role.name ?? 'user',
    permissions: org.entityType === 'HOLDING' ? ['*'] : [],
    modules: org.entityType === 'HOLDING' ? ['*'] : modules,
    holding_id: holdingId,
  }

  const { accessToken, expiresIn } = await signJwt(payload)
  return { accessToken, expiresIn }
}
