import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import {
  addShipmentLegCommand, updateLegStatusCommand,
  addMilestoneCommand,
  raiseExceptionCommand, resolveExceptionCommand,
  listExceptionsQuery, listLegsQuery,
} from '@/modules/shipments/application/commands/shipment-sub-resources.commands'

export const shipmentSubRoutes = new Elysia({ prefix: '/shipments' })
  .use(authMiddleware)

  // GET /shipments/:id/legs
  .get('/:id/legs', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => listLegsQuery(params.id, user.orgId, db))
    return { data: result }
  }, { detail: { tags: ['Shipments'], summary: 'List shipment legs' } })

  // POST /shipments/:id/legs
  .post('/:id/legs', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      addShipmentLegCommand({
        orgId: user.orgId, shipmentId: params.id,
        sequenceNumber: body.sequence_number,
        mode: body.mode as 'SEA' | 'RAIL' | 'ROAD' | 'AIR',
        ownerOrgId: body.owner_org_id ?? user.orgId,
        ...(body.carrier_org_id ? { carrierOrgId: body.carrier_org_id } : {}),
        origin: body.origin, destination: body.destination,
        ...(body.scheduled_departure ? { scheduledDeparture: new Date(body.scheduled_departure) } : {}),
        ...(body.scheduled_arrival ? { scheduledArrival: new Date(body.scheduled_arrival) } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      sequence_number:    t.String(),
      mode:               t.Union([t.Literal('SEA'), t.Literal('RAIL'), t.Literal('ROAD'), t.Literal('AIR')]),
      origin:             t.String(),
      destination:        t.String(),
      owner_org_id:       t.Optional(t.String()),
      carrier_org_id:     t.Optional(t.String()),
      scheduled_departure: t.Optional(t.String()),
      scheduled_arrival:   t.Optional(t.String()),
    }),
    detail: { tags: ['Shipments'], summary: 'Add shipment leg' },
  })

  // PATCH /shipments/:id/legs/:legId
  .patch('/:id/legs/:legId', async ({ user, body, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      updateLegStatusCommand({
        orgId: user.orgId, legId: params.legId,
        status: body.status as 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DELAYED',
        ...(body.actual_departure ? { actualDeparture: new Date(body.actual_departure) } : {}),
        ...(body.actual_arrival ? { actualArrival: new Date(body.actual_arrival) } : {}),
        ...(body.delay_minutes !== undefined ? { delayMinutes: body.delay_minutes } : {}),
      }, db)
    )
    return { data: { message: 'Leg updated.' } }
  }, {
    body: t.Object({
      status:           t.String(),
      actual_departure: t.Optional(t.String()),
      actual_arrival:   t.Optional(t.String()),
      delay_minutes:    t.Optional(t.Number()),
    }),
    detail: { tags: ['Shipments'], summary: 'Update leg status' },
  })

  // POST /shipments/:id/milestones
  .post('/:id/milestones', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      addMilestoneCommand({
        orgId: user.orgId, shipmentId: params.id,
        ...(body.leg_id ? { legId: body.leg_id } : {}),
        milestoneType: body.milestone_type,
        ...(body.location ? { location: body.location } : {}),
        recordedBy: user.id,
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      milestone_type: t.String(),
      leg_id:         t.Optional(t.String()),
      location:       t.Optional(t.String()),
    }),
    detail: { tags: ['Shipments'], summary: 'Add shipment milestone' },
  })

  // GET /shipments/:id/exceptions
  .get('/:id/exceptions', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listExceptionsQuery(params.id, user.orgId, db)
    )
    return { data: result }
  }, { detail: { tags: ['Shipments'], summary: 'List shipment exceptions' } })

  // POST /shipments/:id/exceptions
  .post('/:id/exceptions', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      raiseExceptionCommand({
        orgId: user.orgId, shipmentId: params.id,
        ...(body.leg_id ? { legId: body.leg_id } : {}),
        exceptionType: body.exception_type,
        description: body.description,
        raisedBy: user.id,
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      exception_type: t.String(),
      description:    t.String({ minLength: 1 }),
      leg_id:         t.Optional(t.String()),
    }),
    detail: { tags: ['Shipments'], summary: 'Raise exception' },
  })

  // POST /shipments/:id/exceptions/:exceptionId/resolve
  .post('/:id/exceptions/:exceptionId/resolve', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      resolveExceptionCommand({
        orgId: user.orgId, exceptionId: params.exceptionId, resolvedBy: user.id,
      }, db)
    )
    return { data: { message: 'Exception resolved.' } }
  }, { detail: { tags: ['Shipments'], summary: 'Resolve exception' } })
