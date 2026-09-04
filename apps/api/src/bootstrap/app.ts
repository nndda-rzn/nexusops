import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { cors } from '@elysiajs/cors'
import { env } from '@/shared/config/env'
import { logger } from '@/shared/logging'
import { AppError } from '@/shared/errors'
import { ulid } from 'ulid'
import { healthRoutes } from '@/bootstrap/health.routes'
import { loginRoutes } from '@/modules/identity/presentation/routes/login.routes'
import { tokenRoutes } from '@/modules/identity/presentation/routes/token.routes'
import { entityRoutes } from '@/modules/identity/presentation/routes/entity.routes'
import { operationCommandRoutes } from '@/modules/operations/presentation/routes/operation-commands.routes'
import { listOperationsRoutes } from '@/modules/operations/presentation/routes/list-operations.routes'
import { operationDependencyRoutes } from '@/modules/operations/presentation/routes/operation-dependencies.routes'
import { interventionRoutes } from '@/modules/operations/presentation/routes/intervention.routes'
import { containerRoutes } from '@/modules/containers/presentation/routes/containers.routes'
import { berthRoutes } from '@/modules/terminal/presentation/routes/berth.routes'

export function createApp() {
  return new Elysia()

    .use(cors({
      origin: env.CORS_ORIGINS.split(','),
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'Idempotency-Key'],
    }))

    .use(swagger({
      documentation: {
        info: { title: 'NexusOps API', version: '0.1.0' },
        tags: [
          { name: 'Health' }, { name: 'Auth' }, { name: 'Admin' },
          { name: 'Operations' }, { name: 'Maritime' }, { name: 'Containers' },
          { name: 'Shipments' }, { name: 'Terminal' }, { name: 'Yard' },
          { name: 'Rail' }, { name: 'Road' }, { name: 'Warehouse' },
          { name: 'Assets' }, { name: 'Maintenance' }, { name: 'Workforce' },
          { name: 'Planning' }, { name: 'Billing' }, { name: 'Analytics' },
          { name: 'Intermodal' }, { name: 'Group' },
        ],
      },
      path: '/swagger',
    }))

    .derive({ as: 'global' }, ({ request }) => ({
      requestId: request.headers.get('x-request-id') ?? ulid(),
    }))

    .onRequest(({ request }) => {
      logger.info('Request received', {
        request_id: request.headers.get('x-request-id') ?? 'unknown',
        method: request.method,
        url: request.url,
      })
    })

    .onAfterHandle(({ set }) => {
      set.headers['X-Content-Type-Options'] = 'nosniff'
      set.headers['X-Frame-Options'] = 'DENY'
      set.headers['X-XSS-Protection'] = '1; mode=block'
      set.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    })

    .onError(({ error, set, request }) => {
      const traceId = ulid()
      const pathname = new URL(request.url).pathname

      if (error instanceof AppError) {
        logger.warn('Application error', { error_type: error.type, status: error.status })
        set.status = error.status
        return { type: error.type, title: error.title, status: error.status, detail: error.detail, instance: pathname, trace_id: traceId, ...error.extensions }
      }

      logger.error('Unhandled error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        trace_id: traceId,
      })

      set.status = 500
      return { type: 'https://nexusops.io/errors/internal-server-error', title: 'Internal Server Error', status: 500, detail: 'An unexpected error occurred.', instance: pathname, trace_id: traceId }
    })

    .use(healthRoutes)
    .use(loginRoutes)
    .use(tokenRoutes)
    .use(entityRoutes)
    .use(operationCommandRoutes)
    .use(listOperationsRoutes)
    .use(operationDependencyRoutes)
    .use(interventionRoutes)
    .use(containerRoutes)
    .use(berthRoutes)
}
