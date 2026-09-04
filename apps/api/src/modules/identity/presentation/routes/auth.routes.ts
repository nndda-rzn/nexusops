import { Elysia, t } from 'elysia'
import { loginHandler, switchEntityHandler } from '@/modules/identity/application/commands/auth.commands'
import { logger } from '@/shared/logging'

export const authRoutes = new Elysia({ prefix: '/auth' })

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
  .get('/me', async ({ headers }) => {
    // Returns current user context from JWT
    // Auth middleware will be added in feature/auth/rbac-middleware
    const authHeader = headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return { data: null }
    }

    return {
      data: {
        message: 'Auth middleware coming in next branch',
      },
    }
  }, {
    detail: {
      tags: ['Auth'],
      summary: 'Get current user',
    },
  })
