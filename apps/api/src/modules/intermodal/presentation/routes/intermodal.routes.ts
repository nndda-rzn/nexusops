import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { requestHandoverCommand } from '@/modules/intermodal/application/commands/request-handover.command'
import { respondHandoverCommand } from '@/modules/intermodal/application/commands/respond-handover.command'
import { listHandoverRequestsQuery } from '@/modules/intermodal/application/queries/handover.queries'

export const intermodalRoutes = new Elysia({ prefix: '/intermodal' })
  .use(authMiddleware)

  // GET /intermodal/handovers — list handovers for current entity
  .get('/handovers', async ({ user }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listHandoverRequestsQuery(user.orgId, db)
    )
    return { data: result }
  }, {
    detail: { tags: ['Intermodal'], summary: 'List handover requests' },
  })

  // POST /intermodal/handovers — request handover
  .post('/handovers', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      requestHandoverCommand({
        shipmentId: body.shipment_id,
        legId: body.leg_id,
        ...(body.next_leg_id ? { nextLegId: body.next_leg_id } : {}),
        fromEntityId: user.orgId,
        toEntityId: body.to_entity_id,
        cargoDetails: body.cargo_details,
        ...(body.handover_location ? { handoverLocation: body.handover_location } : {}),
        ...(body.handover_location_type ? { handoverLocationType: body.handover_location_type } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      shipment_id:          t.String(),
      leg_id:               t.String(),
      to_entity_id:         t.String(),
      next_leg_id:          t.Optional(t.String()),
      cargo_details:        t.Optional(t.Record(t.String(), t.Unknown())),
      handover_location:    t.Optional(t.String()),
      handover_location_type: t.Optional(t.String()),
    }),
    detail: { tags: ['Intermodal'], summary: 'Request handover to another entity' },
  })

  // POST /intermodal/handovers/:id/respond — accept or reject
  .post('/handovers/:id/respond', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      respondHandoverCommand({
        handoverId: params.id,
        response: body.response as 'ACCEPT' | 'REJECT',
        ...(body.rejection_reason ? { rejectionReason: body.rejection_reason } : {}),
        respondedBy: user.id,
        respondingEntityId: user.orgId,   // S-03 FIX: pass ownership
      }, db)
    )
    return { data: { message: `Handover ${body.response.toLowerCase()}ed.` } }
  }, {
    body: t.Object({
      response:         t.Union([t.Literal('ACCEPT'), t.Literal('REJECT')]),
      rejection_reason: t.Optional(t.String()),
    }),
    detail: { tags: ['Intermodal'], summary: 'Respond to handover request' },
  })
