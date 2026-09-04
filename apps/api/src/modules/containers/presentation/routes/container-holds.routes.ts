import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { placeHoldCommand } from '@/modules/containers/application/commands/place-hold.command'
import { releaseHoldCommand } from '@/modules/containers/application/commands/release-hold.command'
import { gateOutContainerCommand } from '@/modules/containers/application/commands/gate-out-container.command'
import type { HoldType } from '@/modules/containers/domain/entities/container.entity'

export const containerHoldRoutes = new Elysia({ prefix: '/containers' })
  .use(authMiddleware)

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

  .post('/:id/gate-out', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      gateOutContainerCommand({
        containerId: params.id,
        orgId: user.orgId,
        gateId: body.gate_id,
        actorId: user.id,
      }, db)
    )
    return { data: { message: 'Container gated out.' } }
  }, {
    body: t.Object({ gate_id: t.String() }),
    detail: { tags: ['Containers'], summary: 'Gate out container' },
  })
