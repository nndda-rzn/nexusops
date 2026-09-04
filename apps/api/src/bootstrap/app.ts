import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { cors } from '@elysiajs/cors'
import { env } from '@/shared/config/env'
import { logger } from '@/shared/logging'
import { AppError } from '@/shared/errors'
import { ulid } from 'ulid'

export function createApp() {
  const app = new Elysia()

    // ─────────────────────────────────────────
    // CORS
    // ─────────────────────────────────────────
    .use(cors({
      origin: env.CORS_ORIGINS.split(','),
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Request-ID',
        'Idempotency-Key',
      ],
    }))

    // ─────────────────────────────────────────
    // OpenAPI / Swagger
    // ─────────────────────────────────────────
    .use(swagger({
      documentation: {
        info: {
          title: 'NexusOps API',
          version: '0.1.0',
          description: 'Enterprise Integrated Operations Platform untuk Konglomerat Logistik Multimoda',
        },
        tags: [
          { name: 'Health', description: 'Health check endpoints' },
          { name: 'Auth', description: 'Authentication & authorization' },
          { name: 'Operations', description: 'Operational management' },
          { name: 'Maritime', description: 'Maritime operations' },
          { name: 'Containers', description: 'Container lifecycle' },
          { name: 'Shipments', description: 'Shipment management' },
          { name: 'Terminal', description: 'Terminal operations' },
          { name: 'Yard', description: 'Yard management' },
          { name: 'Rail', description: 'Rail operations' },
          { name: 'Road', description: 'Road operations' },
          { name: 'Warehouse', description: 'Warehouse operations' },
          { name: 'Assets', description: 'Asset management' },
          { name: 'Maintenance', description: 'Maintenance management' },
          { name: 'Workforce', description: 'Workforce management' },
          { name: 'Planning', description: 'Planning & optimization' },
          { name: 'Billing', description: 'Billing & invoicing' },
          { name: 'Analytics', description: 'Analytics & KPI' },
          { name: 'Intermodal', description: 'Cross-entity coordination' },
          { name: 'Group', description: 'Holding group dashboard' },
        ],
      },
      path: '/swagger',
    }))

    // ─────────────────────────────────────────
    // Request ID & Logging
    // ─────────────────────────────────────────
    .derive(({ request }) => {
      const requestId = request.headers.get('x-request-id') ?? ulid()
      return { requestId }
    })

    .onRequest(({ request }) => {
      const requestId = request.headers.get('x-request-id') ?? 'unknown'
      logger.info('Request received', {
        request_id: requestId,
        method: request.method,
        url: request.url,
      })
    })

    .onAfterHandle(({ set }) => {
      // Security headers
      set.headers['X-Content-Type-Options'] = 'nosniff'
      set.headers['X-Frame-Options'] = 'DENY'
      set.headers['X-XSS-Protection'] = '1; mode=block'
      set.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    })

    // ─────────────────────────────────────────
    // Global Error Handler
    // ─────────────────────────────────────────
    .onError(({ error, set, request, requestId }) => {
      const traceId = requestId ?? ulid()
      const pathname = new URL(request.url).pathname

      if (error instanceof AppError) {
        logger.warn('Application error', {
          request_id: traceId,
          error_type: error.type,
          status: error.status,
          detail: error.detail,
        })

        set.status = error.status
        return {
          type: error.type,
          title: error.title,
          status: error.status,
          detail: error.detail,
          instance: pathname,
          trace_id: traceId,
          ...error.extensions,
        }
      }

      // Unexpected error
      logger.error('Unhandled error', {
        request_id: traceId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })

      set.status = 500
      return {
        type: 'https://nexusops.io/errors/internal-server-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred. Please try again later.',
        instance: pathname,
        trace_id: traceId,
      }
    })

    // ─────────────────────────────────────────
    // Health Check
    // ─────────────────────────────────────────
    .get('/health', () => ({
      status: 'healthy',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    }), {
      detail: {
        tags: ['Health'],
        summary: 'Health check',
      },
    })

    .get('/health/ready', async () => {
      // TODO: check DB, Redis, MinIO connectivity
      return {
        status: 'ready',
        checks: {
          database: 'ok',
          redis: 'ok',
          storage: 'ok',
        },
        timestamp: new Date().toISOString(),
      }
    }, {
      detail: {
        tags: ['Health'],
        summary: 'Readiness check',
      },
    })

  return app
}
