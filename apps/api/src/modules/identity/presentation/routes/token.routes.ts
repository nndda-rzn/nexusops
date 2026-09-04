import { Elysia, t } from 'elysia'
import { refreshTokenCommand } from '@/modules/identity/application/commands/refresh-token.command'
import { switchEntityCommand } from '@/modules/identity/application/commands/switch-entity.command'
import { authMiddleware, requireHolding } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { env } from '@/shared/config/env'
import { parseExpiry } from '@/shared/auth/jwt.utils'

const REFRESH_COOKIE = 'refresh_token'
const REFRESH_TTL = parseExpiry(env.JWT_REFRESH_EXPIRES_IN)

export const tokenRoutes = new Elysia({ prefix: '/auth' })
  .use(authMiddleware)

  .post('/refresh', async ({ cookie }) => {
    const raw = cookie[REFRESH_COOKIE]?.value
    const refreshToken = typeof raw === 'string' ? raw : null
    if (!refreshToken) throw new UnauthorizedError('Refresh token not found.')

    const result = await refreshTokenCommand({ refreshToken })

    return {
      data: {
        access_token: result.accessToken,
        expires_in: result.expiresIn,
        token_type: 'Bearer',
      },
    }
  }, {
    detail: { tags: ['Auth'], summary: 'Refresh access token' },
  })

  .post('/switch-entity', async ({ body, user, cookie }) => {
    if (!user) throw new UnauthorizedError()
    requireHolding()({ user })

    const result = await switchEntityCommand({
      userId: user.id,
      currentOrgId: user.orgId,
      holdingId: user.holdingId,
      targetOrgId: body.entity_id,
      currentRole: user.role,     // S-06 FIX: pass actual role
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
        org: result.org,
      },
    }
  }, {
    body: t.Object({ entity_id: t.String() }),
    detail: { tags: ['Auth'], summary: 'Switch entity context (Holding only)' },
  })
