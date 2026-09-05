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
import { vesselsRoutes } from '@/modules/maritime/presentation/routes/vessels.routes'
import { voyagesRoutes } from '@/modules/maritime/presentation/routes/voyages.routes'
import { portCallsRoutes } from '@/modules/maritime/presentation/routes/port-calls.routes'
import { portCallLifecycleRoutes } from '@/modules/maritime/presentation/routes/port-call-lifecycle.routes'
import { railResourcesRoutes } from '@/modules/rail/presentation/routes/rail-resources.routes'
import { trainsRoutes } from '@/modules/rail/presentation/routes/trains.routes'
import { trainLifecycleRoutes } from '@/modules/rail/presentation/routes/train-lifecycle.routes'
import { vehiclesRoutes } from '@/modules/road/presentation/routes/vehicles.routes'
import { tripsRoutes } from '@/modules/road/presentation/routes/trips.routes'
import { employeesRoutes } from '@/modules/workforce/presentation/routes/employees.routes'
import { employeeProfileRoutes } from '@/modules/workforce/presentation/routes/employee-profile.routes'
import { workforceResourcesRoutes } from '@/modules/workforce/presentation/routes/workforce-resources.routes'
import { workforceAssignmentsRoutes } from '@/modules/workforce/presentation/routes/workforce-assignments.routes'
import { assetsRoutes } from '@/modules/assets/presentation/routes/assets.routes'
import { assetOperationsRoutes } from '@/modules/assets/presentation/routes/asset-operations.routes'
import { workOrdersRoutes } from '@/modules/maintenance/presentation/routes/work-orders.routes'
import { maintenanceResourcesRoutes } from '@/modules/maintenance/presentation/routes/maintenance-resources.routes'
import { yardRoutes } from '@/modules/yard/presentation/routes/yard.routes'
import { yardContainerRoutes } from '@/modules/yard/presentation/routes/yard-container.routes'
import { warehouseRoutes } from '@/modules/warehouse/presentation/routes/warehouse.routes'
import { warehouseOperationsRoutes } from '@/modules/warehouse/presentation/routes/warehouse-operations.routes'
import { aviationRoutes } from '@/modules/aviation/presentation/routes/aviation.routes'
import { aviationOperationsRoutes } from '@/modules/aviation/presentation/routes/aviation-operations.routes'
import { aviationDocsRoutes } from '@/modules/aviation/presentation/routes/aviation-docs.routes'
import { aviationHandlingRoutes } from '@/modules/aviation/presentation/routes/aviation-handling.routes'
import { planningRoutes } from '@/modules/planning/presentation/routes/optimization-jobs.routes'
import { planningPlansRoutes } from '@/modules/planning/presentation/routes/plans-scenarios.routes'
import { planningConstraintsRoutes } from '@/modules/planning/presentation/routes/planning-constraints.routes'
import { planningAllocationRoutes } from '@/modules/planning/presentation/routes/resource-allocation.routes'

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
          { name: 'Intermodal' }, { name: 'Group' }, { name: 'Shared Master' },
          { name: 'Aviation' }, { name: 'Planning' },
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

    .use(healthRoutes)
    .use(loginRoutes).use(tokenRoutes).use(entityRoutes)
    .use(operationCommandRoutes).use(listOperationsRoutes)
    .use(operationDependencyRoutes).use(interventionRoutes)
    .use(containerRoutes).use(containerHoldRoutes).use(containerQueryRoutes)
    .use(berthRoutes).use(craneRoutes).use(terminalManagementRoutes)
    .use(shipmentRoutes).use(shipmentSubRoutes).use(intermodalRoutes)
    .use(portsRoutes).use(stationsRoutes).use(airportsRoutes)
    .use(vesselsRoutes).use(voyagesRoutes)
    .use(portCallsRoutes).use(portCallLifecycleRoutes)
    .use(railResourcesRoutes).use(trainsRoutes).use(trainLifecycleRoutes)
    .use(vehiclesRoutes).use(tripsRoutes)
    .use(employeesRoutes).use(employeeProfileRoutes).use(workforceResourcesRoutes).use(workforceAssignmentsRoutes)
    .use(assetsRoutes).use(assetOperationsRoutes)
    .use(workOrdersRoutes).use(maintenanceResourcesRoutes)
    .use(yardRoutes).use(yardContainerRoutes)
    .use(warehouseRoutes).use(warehouseOperationsRoutes)
    .use(aviationRoutes).use(aviationOperationsRoutes).use(aviationDocsRoutes).use(aviationHandlingRoutes)
    .use(planningRoutes).use(planningPlansRoutes).use(planningConstraintsRoutes).use(planningAllocationRoutes)
}
