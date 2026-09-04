import { Elysia } from 'elysia'
import { verifyJwt } from '@/shared/auth/jwt'
import { setRequestContext } from '@/shared/database/client'
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
// Verifies JWT, sets PostgreSQL RLS context,
// attaches user to request context
// ─────────────────────────────────────────

export const authMiddleware = new Elysia({ name: 'auth-middleware' })
  .derive({ as: 'global' }, async ({ headers, request }): Promise<{ user: AuthUser | null }> => {
    const authHeader = headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return { user: null }
    }

    const token = authHeader.replace('Bearer ', '')

    try {
      const payload: JwtPayload = await verifyJwt(token)

      // Set PostgreSQL RLS context
      await setRequestContext({
        orgId: payload.org_id,
        entityType: payload.entity_type,
        holdingId: payload.holding_id,
      })

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
// requireAuth guard
// Throws 401 if user is not authenticated
// ─────────────────────────────────────────

export const requireAuth = new Elysia({ name: 'require-auth' })
  .use(authMiddleware)
  .macro({
    auth: (enabled: boolean) => ({
      beforeHandle({ user }: { user: AuthUser | null }) {
        if (enabled && !user) {
          throw new UnauthorizedError()
        }
      }
    })
  })

// ─────────────────────────────────────────
// requireModule guard
// Throws 403 if entity doesn't have module access
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

// ─────────────────────────────────────────
// requirePermission guard
// Throws 403 if user doesn't have permission
// ─────────────────────────────────────────

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

// ─────────────────────────────────────────
// requireHolding guard
// Throws 403 if user is not from Holding entity
// ─────────────────────────────────────────

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

// ─────────────────────────────────────────
// requireEntityType guard
// Throws 403 if user is not from specified entity type
// ─────────────────────────────────────────

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
