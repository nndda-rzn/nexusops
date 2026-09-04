import { Elysia, t } from 'elysia'
import {
  loginHandler,
  refreshTokenHandler,
  switchEntityHandler,
} from '@/modules/identity/application/commands/auth.commands'
import { authMiddleware, requireHolding } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { getRedis, RedisKeys } from '@/shared/redis'
import { logger } from '@/shared/logging'
import { parseExpiry } from '@/shared/auth/jwt.utils'
import { env } from '@/shared/config/env'

const REFRESH_TOKEN_COOKIE = 'refresh_token'
const REFRESH_COOKIE_MAX_AGE = parseExpiry(env.JWT_REFRESH_EXPIRES_IN)

export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(authMiddleware)

  // ─────────────────────────────────────────
  // POST /auth/login
  // ─────────────────────────────────────────
  .post('/login', async ({ body, set, cookie, request }) => {
    const ipAddress = request.headers.get('x-forwarded-for')
      ?? request.headers.get('x-real-ip')
      ?? 'unknown'
    const userAgent = request.headers.get('user-agent') ?? 'unknown'

    const result = await loginHandler({
      email: body.email,
      password: body.password,
      orgId: body.org_id,
      ipAddress,
      userAgent,
    })

    // Set refresh token as httpOnly cookie
    cookie[REFRESH_TOKEN_COOKIE]?.set({
      value: result.refreshToken,
      httpOnly: true,
      secure: env.APP_ENV === 'production',
      sameSite: 'lax',
      maxAge: REFRESH_COOKIE_MAX_AGE,
      path: '/auth',
    })

    return {
      data: {
        access_token: result.accessToken,
        expires_in: result.expiresIn,
        token_type: 'Bearer',
        user: result.user,
        org: result.org,
      },
    }
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String({ minLength: 8 }),
      org_id: t.Optional(t.String()),
    }),
    detail: {
      tags: ['Auth'],
      summary: 'Login',
      description: 'Authenticate user and get access token. Refresh token is set as httpOnly cookie.',
    },
  })

  // ─────────────────────────────────────────
  // POST /auth/refresh
  // ─────────────────────────────────────────
  .post('/refresh', async ({ cookie, set }) => {
    const rawToken = cookie[REFRESH_TOKEN_COOKIE]?.value
    const refreshToken = typeof rawToken === 'string' ? rawToken : null
    if (!refreshToken) throw new UnauthorizedError('Refresh token not found.')

    const result = await refreshTokenHandler({ refreshToken })

    // Rotate: set new refresh token cookie
    cookie[REFRESH_TOKEN_COOKIE]?.set({
      value: refreshToken, // same token — rotation happens in handler
      httpOnly: true,
      secure: env.APP_ENV === 'production',
      sameSite: 'lax',
      maxAge: REFRESH_COOKIE_MAX_AGE,
      path: '/auth',
    })

    return {
      data: {
        access_token: result.accessToken,
        expires_in: result.expiresIn,
        token_type: 'Bearer',
      },
    }
  }, {
    detail: {
      tags: ['Auth'],
      summary: 'Refresh access token',
      description: 'Exchange refresh token cookie for a new access token.',
    },
  })

  // ─────────────────────────────────────────
  // POST /auth/logout
  // ─────────────────────────────────────────
  .post('/logout', async ({ user, cookie }) => {
    if (user?.jti) {
      // Blacklist the JWT by its JTI in Redis until expiry
      const redis = getRedis()
      const remainingTtl = 3600 // 1 hour max — matches access token expiry
      await redis.setex(RedisKeys.jwtBlacklist(user.jti), remainingTtl, '1')
    }

    // Clear refresh token cookie
    cookie[REFRESH_TOKEN_COOKIE]?.remove()

    logger.info('User logged out', { user_id: user?.id })

    return { data: { message: 'Logged out successfully.' } }
  }, {
    detail: {
      tags: ['Auth'],
      summary: 'Logout',
      description: 'Invalidate access token and clear refresh token cookie.',
    },
  })

  // ─────────────────────────────────────────
  // GET /auth/me
  // ─────────────────────────────────────────
  .get('/me', async ({ user }) => {
    if (!user) throw new UnauthorizedError()

    return {
      data: {
        id: user.id,
        org_id: user.orgId,
        entity_type: user.entityType,
        role: user.role,
        permissions: user.permissions,
        modules: user.modules,
        holding_id: user.holdingId,
        switched_from: user.switchedFrom,
      },
    }
  }, {
    detail: {
      tags: ['Auth'],
      summary: 'Get current user',
    },
  })

  // ─────────────────────────────────────────
  // GET /auth/entities — list orgs user has access to
  // ─────────────────────────────────────────
  .get('/entities', async ({ user }) => {
    if (!user) throw new UnauthorizedError()

    // Import here to avoid circular dependency
    const { listEntitiesHandler } = await import(
      '@/modules/identity/application/commands/entity.commands'
    )
    const entities = await listEntitiesHandler(user.holdingId)
    return { data: entities }
  }, {
    detail: {
      tags: ['Auth'],
      summary: 'List accessible entities',
    },
  })

  // ─────────────────────────────────────────
  // POST /auth/switch-entity — Holding switch to entity context
  // ─────────────────────────────────────────
  .post('/switch-entity', async ({ body, user, cookie }) => {
    if (!user) throw new UnauthorizedError()
    requireHolding()({ user })

    const result = await switchEntityHandler({
      userId: user.id,
      currentOrgId: user.orgId,
      holdingId: user.holdingId,
      targetOrgId: body.entity_id,
    })

    cookie[REFRESH_TOKEN_COOKIE]?.set({
      value: result.refreshToken,
      httpOnly: true,
      secure: env.APP_ENV === 'production',
      sameSite: 'lax',
      maxAge: REFRESH_COOKIE_MAX_AGE,
      path: '/auth',
    })

    return {
      data: {
        access_token: result.accessToken,
        expires_in: result.expiresIn,
        token_type: 'Bearer',
        org: result.org,
      },
    }
  }, {
    body: t.Object({
      entity_id: t.String(),
    }),
    detail: {
      tags: ['Auth'],
      summary: 'Switch entity context (Holding only)',
    },
  })
