import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { announceContainerCommand } from '@/modules/containers/application/commands/announce-container.command'
import { moveContainerCommand } from '@/modules/containers/application/commands/move-container.command'
import { placeHoldCommand } from '@/modules/containers/application/commands/place-hold.command'
import { releaseHoldCommand } from '@/modules/containers/application/commands/release-hold.command'
import { gateOutContainerCommand } from '@/modules/containers/application/commands/gate-out-container.command'
import { getContainerQuery } from '@/modules/containers/application/queries/get-container.query'
import type { ContainerType, ContainerSize, HoldType } from '@/modules/containers/domain/entities/container.entity'

export const containerRoutes = new Elysia({ prefix: '/containers' })
  .use(authMiddleware)

  .post('/', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      announceContainerCommand({
        orgId: user.orgId,
        containerNumber: body.container_number,
        type: body.type as ContainerType,
        size: body.size as ContainerSize,
        ...(body.shipment_id ? { shipmentId: body.shipment_id } : {}),
        ...(body.vessel_id ? { vesselId: body.vessel_id } : {}),
        ...(body.seal_number ? { sealNumber: body.seal_number } : {}),
        isHazmat: body.is_hazmat ?? false,
        ...(body.hazmat_class ? { hazmatClass: body.hazmat_class } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      container_number: t.String(),
      type:             t.String(),
      size:             t.String(),
      shipment_id:      t.Optional(t.String()),
      vessel_id:        t.Optional(t.String()),
      seal_number:      t.Optional(t.String()),
      is_hazmat:        t.Optional(t.Boolean()),
      hazmat_class:     t.Optional(t.String()),
    }),
    detail: { tags: ['Containers'], summary: 'Announce container arrival' },
  })

  .get('/:id', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    return withDbContext(user, (db) => getContainerQuery(params.id, db))
  }, {
    detail: { tags: ['Containers'], summary: 'Get container by ID' },
  })

  .post('/:id/move', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      moveContainerCommand({
        containerId: params.id,
        toLocationType: body.to_location_type,
        toLocationId: body.to_location_id,
        ...(body.equipment_id ? { equipmentId: body.equipment_id } : {}),
        ...(body.notes ? { notes: body.notes } : {}),
        operatorId: user.id,
        actorId: user.id,
      }, db)
    )
    return { data: { message: 'Container moved.' } }
  }, {
    body: t.Object({
      to_location_type: t.String(),
      to_location_id:   t.String(),
      equipment_id:     t.Optional(t.String()),
      notes:            t.Optional(t.String()),
    }),
    detail: { tags: ['Containers'], summary: 'Move container' },
  })

  // POST /containers/:id/hold — place hold
  .post('/:id/hold', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      placeHoldCommand({
        containerId: params.id,
        orgId: user.orgId,
        holdType: body.hold_type as HoldType,
        reason: body.reason,
        ...(body.notes ? { notes: body.notes } : {}),
        placedBy: user.id,
      }, db)
    )
    return { data: { message: 'Hold placed.' } }
  }, {
    body: t.Object({
      hold_type: t.String(),
      reason:    t.String({ minLength: 1 }),
      notes:     t.Optional(t.String()),
    }),
    detail: { tags: ['Containers'], summary: 'Place hold on container' },
  })

  // POST /containers/:id/release/:holdId — release hold
  .post('/:id/release/:holdId', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      releaseHoldCommand({
        containerId: params.id,
        orgId: user.orgId,
        holdId: params.holdId,
        releasedBy: user.id,
      }, db)
    )
    return { data: { message: 'Hold released.' } }
  }, {
    detail: { tags: ['Containers'], summary: 'Release container hold' },
  })

  // POST /containers/:id/gate-out — gate out
  .post('/:id/gate-out', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      gateOutContainerCommand({
        containerId: params.id,
        gateId: body.gate_id,
        actorId: user.id,
      }, db)
    )
    return { data: { message: 'Container gated out.' } }
  }, {
    body: t.Object({ gate_id: t.String() }),
    detail: { tags: ['Containers'], summary: 'Gate out container' },
  })
