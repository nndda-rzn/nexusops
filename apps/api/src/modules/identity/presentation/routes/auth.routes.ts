import { Elysia, t } from 'elysia'
import { loginHandler, switchEntityHandler } from '@/modules/identity/application/commands/auth.commands'
import { authMiddleware, requireHolding } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { logger } from '@/shared/logging'

export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(authMiddleware)

  // ─────────────────────────────────────────
  // POST /auth/login
  // ─────────────────────────────────────────
  .post('/login', async ({ body, cookie }) => {
    const result = await loginHandler({
      email: body.email,
      password: body.password,
      orgId: body.org_id,
    })

    // Set refresh token as httpOnly cookie
    // NOTE: actual refresh token implementation coming in next iteration
    logger.info('User logged in', {
      user_id: result.user.id,
      org_id: result.org.id,
      entity_type: result.org.entityType,
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
      description: 'Authenticate user and get access token',
    },
  })

  // ─────────────────────────────────────────
  // POST /auth/logout
  // ─────────────────────────────────────────
  .post('/logout', async ({ cookie }) => {
    // TODO: blacklist JWT in Redis
    // TODO: revoke refresh token
    return { data: { message: 'Logged out successfully' } }
  }, {
    detail: {
      tags: ['Auth'],
      summary: 'Logout',
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
