import { Elysia } from 'elysia'
import { verifyJwt } from '@/shared/auth/jwt'
import { withRequestContext } from '@/shared/database/client'
import { UnauthorizedError, ForbiddenError } from '@/shared/errors'
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
// Use this in every handler that queries the database
//
// Usage:
//   const vessels = await withDbContext(user, async (db) => {
//     return db.select().from(maritime.vessels)
//   })
// ─────────────────────────────────────────

export async function withDbContext<T>(
  user: AuthUser,
  fn: Parameters<typeof withRequestContext>[1]
): Promise<T> {
  return withRequestContext(
    {
      orgId: user.orgId,
      entityType: user.entityType,
      holdingId: user.holdingId,
    },
    fn
  ) as Promise<T>
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
