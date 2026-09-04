import { Elysia, t } from 'elysia'
import { loginCommand } from '@/modules/identity/application/commands/login.command'
import { authMiddleware } from '@/shared/auth/middleware'
import { getRedis, RedisKeys } from '@/shared/redis'
import { env } from '@/shared/config/env'
import { parseExpiry } from '@/shared/auth/jwt.utils'
import { UnauthorizedError } from '@/shared/errors'
import { logger } from '@/shared/logging'

const REFRESH_COOKIE = 'refresh_token'
const REFRESH_TTL = parseExpiry(env.JWT_REFRESH_EXPIRES_IN)

export const loginRoutes = new Elysia({ prefix: '/auth' })
  .use(authMiddleware)

  .post('/login', async ({ body, cookie, request }) => {
    const result = await loginCommand({
      email: body.email,
      password: body.password,
      orgId: body.org_id,
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown',
      userAgent: request.headers.get('user-agent') ?? 'unknown',
    })

    cookie[REFRESH_COOKIE]?.set({
      value: result.refreshToken,
      httpOnly: true,
      secure: env.APP_ENV === 'production',
      sameSite: 'lax',
      maxAge: REFRESH_TTL,
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
    detail: { tags: ['Auth'], summary: 'Login' },
  })

  .post('/logout', async ({ user, cookie }) => {
    if (user?.jti) {
      const redis = getRedis()
      await redis.setex(RedisKeys.jwtBlacklist(user.jti), 3600, '1')
    }
    cookie[REFRESH_COOKIE]?.remove()
    logger.info('User logged out', { user_id: user?.id })
    return { data: { message: 'Logged out successfully.' } }
  }, {
    detail: { tags: ['Auth'], summary: 'Logout' },
  })

  .get('/me', ({ user }) => {
    if (!user) throw new UnauthorizedError()
    return {
      data: {
        id: user.id, org_id: user.orgId, entity_type: user.entityType,
        role: user.role, permissions: user.permissions, modules: user.modules,
        holding_id: user.holdingId, switched_from: user.switchedFrom,
      },
    }
  }, {
    detail: { tags: ['Auth'], summary: 'Get current user' },
  })
