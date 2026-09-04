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

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

export interface RefreshTokenCommand {
  refreshToken: string
  ipAddress?: string | undefined
  userAgent?: string | undefined
}

export interface RefreshTokenResult {
  accessToken: string
  expiresIn: number
}

// ─────────────────────────────────────────
// Handler
// ─────────────────────────────────────────

export async function refreshTokenCommand(
  cmd: RefreshTokenCommand
): Promise<RefreshTokenResult> {
  const tokenRows = await db
    .select()
    .from(refreshTokens)
    .where(isNull(refreshTokens.revokedAt))
    .limit(100)

  let matched = null
  for (const row of tokenRows) {
    if (row.expiresAt < new Date()) continue
    const ok = await verify(row.tokenHash, cmd.refreshToken).catch(() => false)
    if (ok) { matched = row; break }
  }

  if (!matched) throw new InvalidRefreshTokenError()

  await db.update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, matched.id))

  const [user] = await db.select().from(users)
    .where(eq(users.id, matched.userId)).limit(1)
  const [org] = await db.select().from(organizations)
    .where(eq(organizations.id, matched.orgId)).limit(1)

  if (!user || !org) throw new InvalidRefreshTokenError()
  if (user.status !== 'ACTIVE' || org.status !== 'ACTIVE') throw new InvalidRefreshTokenError()

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
