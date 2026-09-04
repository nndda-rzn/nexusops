import { Elysia } from 'elysia'
import { verifyJwt } from '@/shared/auth/jwt'
import { withRequestContext } from '@/shared/database/client'
import type { DbContext } from '@/shared/database/client'
import { UnauthorizedError, ForbiddenError } from '@/shared/errors'
import { getRedis, RedisKeys } from '@/shared/redis'
import type { JwtPayload } from '@/shared/auth/jwt.types'

// ─────────────────────────────────────────
// Auth Context Type
// ─────────────────────────────────────────

export interface AuthUser {
  id: string
  orgId: string
  entityType: string
  role: string
  permissions: string[]
  modules: string[]
  holdingId: string
  switchedFrom?: string | undefined
  jti: string
}

// ─────────────────────────────────────────
// Auth Middleware
// Verifies JWT, attaches user to request context.
// DB context (RLS) is set per-query via withRequestContext()
// ─────────────────────────────────────────

export const authMiddleware = new Elysia({ name: 'auth-middleware' })
  .derive({ as: 'global' }, async ({ headers }): Promise<{ user: AuthUser | null }> => {
    const authHeader = headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return { user: null }
    }

    const token = authHeader.replace('Bearer ', '')

    try {
      const payload: JwtPayload = await verifyJwt(token)

      // Check JWT blacklist in Redis (revoked tokens)
      const redis = getRedis()
      const isBlacklisted = await redis.exists(RedisKeys.jwtBlacklist(payload.jti))
      if (isBlacklisted) {
        return { user: null }
      }

      return {
        user: {
          id: payload.sub,
          orgId: payload.org_id,
          entityType: payload.entity_type,
          role: payload.role,
          permissions: payload.permissions,
          modules: payload.modules,
          holdingId: payload.holding_id,
          switchedFrom: payload.switched_from,
          jti: payload.jti,
        },
      }
    } catch {
      return { user: null }
    }
  })

// ─────────────────────────────────────────
// withDbContext — wraps a DB operation with RLS context
//
// Use this in EVERY domain route handler that queries the database.
// Pass the resulting db instance to command/query handlers.
//
// Pattern:
//   .get('/vessels', async ({ user }) => {
//     if (!user) throw new UnauthorizedError()
//     return withDbContext(user, (db) => listVesselsQuery(filter, db))
//   })
// ─────────────────────────────────────────

export async function withDbContext<T>(
  user: AuthUser,
  fn: (db: DbContext) => Promise<T>
): Promise<T> {
  return withRequestContext(
    {
      orgId: user.orgId,
      entityType: user.entityType,
      holdingId: user.holdingId,
    },
    fn
  )
}

// ─────────────────────────────────────────
// Guards
// ─────────────────────────────────────────

export function requireModule(module: string) {
  return ({ user }: { user: AuthUser | null }) => {
    if (!user) throw new UnauthorizedError()
    if (!user.modules.includes('*') && !user.modules.includes(module)) {
      throw new ForbiddenError(
        `Module '${module}' is not available for your organization.`,
        { module }
      )
    }
  }
}

export function requirePermission(permission: string) {
  return ({ user }: { user: AuthUser | null }) => {
    if (!user) throw new UnauthorizedError()
    if (!user.permissions.includes('*') && !user.permissions.includes(permission)) {
      throw new ForbiddenError(
        `Missing required permission: ${permission}`,
        { permission }
      )
    }
  }
}

export function requireHolding() {
  return ({ user }: { user: AuthUser | null }) => {
    if (!user) throw new UnauthorizedError()
    if (user.entityType !== 'HOLDING') {
      throw new ForbiddenError(
        'This action is only available to Holding entity users.'
      )
    }
  }
}

export function requireEntityType(...entityTypes: string[]) {
  return ({ user }: { user: AuthUser | null }) => {
    if (!user) throw new UnauthorizedError()
    if (!entityTypes.includes(user.entityType) && user.entityType !== 'HOLDING') {
      throw new ForbiddenError(
        `This action requires entity type: ${entityTypes.join(', ')}`,
        { required: entityTypes, current: user.entityType }
      )
    }
  }
}
