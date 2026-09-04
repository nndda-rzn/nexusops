import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { dischargeContainerCommand } from '@/modules/containers/application/commands/discharge-container.command'
import { gateInContainerCommand } from '@/modules/containers/application/commands/gate-in-container.command'
import { listContainersQuery, getContainerMovementsQuery, getContainerHoldsQuery } from '@/modules/containers/application/queries/container-list.queries'
import type { ContainerStatus } from '@/modules/containers/domain/entities/container.entity'

export const containerQueryRoutes = new Elysia({ prefix: '/containers' })
  .use(authMiddleware)

  // GET /containers
  .get('/', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    return withDbContext(user, (db) =>
      listContainersQuery(user.orgId, {
        ...(query.status ? { status: query.status as ContainerStatus } : {}),
        ...(query.shipment_id ? { shipmentId: query.shipment_id } : {}),
        page: query.page ? Number(query.page) : undefined,
        limit: query.limit ? Number(query.limit) : undefined,
      }, db)
    )
  }, {
    query: t.Object({
      status:      t.Optional(t.String()),
      shipment_id: t.Optional(t.String()),
      page:        t.Optional(t.String()),
      limit:       t.Optional(t.String()),
    }),
    detail: { tags: ['Containers'], summary: 'List containers' },
  })

  // GET /containers/:id/movements
  .get('/:id/movements', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      getContainerMovementsQuery(params.id, user.orgId, db)
    )
    return { data: result }
  }, {
    detail: { tags: ['Containers'], summary: 'Get container movement history' },
  })

  // GET /containers/:id/holds
  .get('/:id/holds', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      getContainerHoldsQuery(params.id, user.orgId, db)
    )
    return { data: result }
  }, {
    detail: { tags: ['Containers'], summary: 'Get container holds' },
  })

  // POST /containers/:id/discharge
  .post('/:id/discharge', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      dischargeContainerCommand({
        containerId: params.id,
        orgId: user.orgId,
        fromVesselId: body.from_vessel_id,
        toBerthId: body.to_berth_id,
        ...(body.equipment_id ? { equipmentId: body.equipment_id } : {}),
        operatorId: user.id,
        actorId: user.id,
      }, db)
    )
    return { data: { message: 'Container discharged.' } }
  }, {
    body: t.Object({
      from_vessel_id: t.String(),
      to_berth_id:    t.String(),
      equipment_id:   t.Optional(t.String()),
    }),
    detail: { tags: ['Containers'], summary: 'Discharge container from vessel' },
  })

  // POST /containers/:id/gate-in
  .post('/:id/gate-in', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      gateInContainerCommand({
        containerId: params.id,
        orgId: user.orgId,
        gateId: body.gate_id,
        actorId: user.id,
      }, db)
    )
    return { data: { message: 'Container gated in.' } }
  }, {
    body: t.Object({ gate_id: t.String() }),
    detail: { tags: ['Containers'], summary: 'Gate in container' },
  })
