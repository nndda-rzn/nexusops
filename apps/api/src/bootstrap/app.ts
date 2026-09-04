import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { cors } from '@elysiajs/cors'
import { env } from '@/shared/config/env'
import { logger } from '@/shared/logging'
import { ulid } from 'ulid'
import { errorHandler } from '@/bootstrap/error-handler'
import { healthRoutes } from '@/bootstrap/health.routes'
import { loginRoutes } from '@/modules/identity/presentation/routes/login.routes'
import { tokenRoutes } from '@/modules/identity/presentation/routes/token.routes'
import { entityRoutes } from '@/modules/identity/presentation/routes/entity.routes'
import { operationCommandRoutes } from '@/modules/operations/presentation/routes/operation-commands.routes'
import { listOperationsRoutes } from '@/modules/operations/presentation/routes/list-operations.routes'
import { operationDependencyRoutes } from '@/modules/operations/presentation/routes/operation-dependencies.routes'
import { interventionRoutes } from '@/modules/operations/presentation/routes/intervention.routes'
import { containerRoutes } from '@/modules/containers/presentation/routes/containers.routes'
import { containerHoldRoutes } from '@/modules/containers/presentation/routes/container-holds.routes'
import { containerQueryRoutes } from '@/modules/containers/presentation/routes/container-queries.routes'
import { berthRoutes } from '@/modules/terminal/presentation/routes/berth.routes'
import { craneRoutes } from '@/modules/terminal/presentation/routes/crane.routes'
import { terminalManagementRoutes } from '@/modules/terminal/presentation/routes/terminal-management.routes'
import { shipmentRoutes } from '@/modules/shipments/presentation/routes/shipments.routes'
import { shipmentSubRoutes } from '@/modules/shipments/presentation/routes/shipment-sub.routes'
import { intermodalRoutes } from '@/modules/intermodal/presentation/routes/intermodal.routes'
import { portsRoutes } from '@/modules/shared-master/presentation/routes/ports.routes'
import { stationsRoutes } from '@/modules/shared-master/presentation/routes/stations.routes'
import { airportsRoutes } from '@/modules/shared-master/presentation/routes/airports.routes'

export function createApp() {
  return new Elysia()

    .use(errorHandler)

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
      set.headers['X-XSX-Protection'] = '1; mode=block'
      set.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
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
    .use(containerHoldRoutes)
    .use(containerQueryRoutes)
    .use(berthRoutes)
    .use(craneRoutes)
    .use(terminalManagementRoutes)
    .use(shipmentRoutes)
    .use(shipmentSubRoutes)
    .use(intermodalRoutes)
    .use(portsRoutes)
    .use(stationsRoutes)
    .use(airportsRoutes)
}
