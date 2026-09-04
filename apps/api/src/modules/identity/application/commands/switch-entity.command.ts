import { db } from '@/shared/database/client'
import {
  users,
  organizations,
  orgModuleAccess,
  refreshTokens,
} from '@/shared/database/schema/identity'
import { eq, and, isNull } from 'drizzle-orm'
import { hashPassword } from '@/shared/auth/password'
import { signJwt } from '@/shared/auth/jwt'
import { generateId } from '@/shared/ids'
import { env } from '@/shared/config/env'
import { parseExpiry } from '@/shared/auth/jwt.utils'
import {
  InvalidCredentialsError,
  OrgSuspendedError,
  EntityNotFoundError,
} from '@/modules/identity/domain/errors/auth.errors'
import type { JwtPayload } from '@/shared/auth/jwt.types'

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

export interface SwitchEntityCommand {
  userId: string
  currentOrgId: string
  holdingId: string
  targetOrgId: string
  currentRole: string    // S-06 FIX: pass actual role instead of hardcoding
}

export interface SwitchEntityResult {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: { id: string; name: string; email: string }
  org: { id: string; name: string; entityType: string }
}

// ─────────────────────────────────────────
// Handler
// ─────────────────────────────────────────

export async function switchEntityCommand(
  cmd: SwitchEntityCommand
): Promise<SwitchEntityResult> {
  const [targetOrg] = await db
    .select()
    .from(organizations)
    .where(and(
      eq(organizations.id, cmd.targetOrgId),
      eq(organizations.parentOrgId, cmd.holdingId),
      isNull(organizations.deletedAt),
    ))
    .limit(1)

  if (!targetOrg) throw new EntityNotFoundError(cmd.targetOrgId)
  if (targetOrg.status !== 'ACTIVE') throw new OrgSuspendedError()

  const [user] = await db.select().from(users)
    .where(eq(users.id, cmd.userId)).limit(1)
  if (!user) throw new InvalidCredentialsError()

  const moduleRows = await db
    .select({ moduleKey: orgModuleAccess.moduleKey })
    .from(orgModuleAccess)
    .where(and(eq(orgModuleAccess.orgId, targetOrg.id), eq(orgModuleAccess.enabled, true)))

  const modules = moduleRows.map(r => r.moduleKey)

  const payload: Omit<JwtPayload, 'jti' | 'iat' | 'exp'> = {
    sub: user.id, org_id: targetOrg.id, entity_type: targetOrg.entityType,
    role: cmd.currentRole,        // S-06 FIX: use actual role, not hardcoded
    permissions: ['*'],
    modules,
    holding_id: cmd.holdingId,
    switched_from: cmd.currentOrgId,
  }

  const { accessToken, expiresIn } = await signJwt(payload)
  const refreshTokenValue = generateId() + generateId() + generateId()
  const tokenPrefix = refreshTokenValue.substring(0, 8)  // S-05 FIX: store prefix
  const refreshExpiresAt = new Date(Date.now() + parseExpiry(env.JWT_REFRESH_EXPIRES_IN) * 1000)

  await db.insert(refreshTokens).values({
    id: generateId(), userId: user.id, orgId: targetOrg.id,
    tokenPrefix,                                          // ← prefix stored
    tokenHash: await hashPassword(refreshTokenValue),
    expiresAt: refreshExpiresAt,
  })

  return {
    accessToken, refreshToken: refreshTokenValue, expiresIn,
    user: { id: user.id, name: user.name, email: user.email },
    org: { id: targetOrg.id, name: targetOrg.name, entityType: targetOrg.entityType },
  }
}
