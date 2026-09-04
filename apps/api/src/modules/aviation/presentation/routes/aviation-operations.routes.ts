import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { transitionFlightCommand, departFlightCommand, arriveFlightCommand, confirmSlotCommand, closeManifestCommand, approveLoadPlanCommand, assignAviationCrewCommand, declareAogCommand } from '@/modules/aviation/application/commands/aviation-lifecycle.commands'

export const aviationOperationsRoutes = new Elysia({ prefix: '/aviation' })
  .use(authMiddleware)

  .post('/flights/:id/confirm-slot', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      confirmSlotCommand({ flightId: params.id, orgId: user.orgId, slotId: body.slot_id }, db)
    )
    return { data: { message: 'Slot confirmed.' } }
  }, {
    body: t.Object({ slot_id: t.String() }),
    detail: { tags: ['Aviation'], summary: 'Confirm airport slot' },
  })

  .post('/flights/:id/open-acceptance', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      transitionFlightCommand({ flightId: params.id, orgId: user.orgId, to: 'CARGO_ACCEPTANCE' }, db)
    )
    return { data: { message: 'Cargo acceptance opened.' } }
  }, { detail: { tags: ['Aviation'], summary: 'Open cargo acceptance' } })

  .post('/flights/:id/close-manifest', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      closeManifestCommand({ flightId: params.id, orgId: user.orgId, manifestId: body.manifest_id }, db)
    )
    return { data: { message: 'Manifest closed.' } }
  }, {
    body: t.Object({ manifest_id: t.String() }),
    detail: { tags: ['Aviation'], summary: 'Close cargo manifest' },
  })

  .post('/flights/:id/approve-load-plan', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      approveLoadPlanCommand({
        flightId: params.id, orgId: user.orgId,
        loadPlanId: body.load_plan_id, approvedBy: user.id,
      }, db)
    )
    return { data: { message: 'Load plan approved.' } }
  }, {
    body: t.Object({ load_plan_id: t.String() }),
    detail: { tags: ['Aviation'], summary: 'Approve load plan' },
  })

  .post('/flights/:id/depart', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      departFlightCommand({
        flightId: params.id, orgId: user.orgId,
        ...(body.actual_departure ? { actualDeparture: new Date(body.actual_departure) } : {}),
      }, db)
    )
    return { data: { message: 'Flight departed.' } }
  }, {
    body: t.Object({ actual_departure: t.Optional(t.String()) }),
    detail: { tags: ['Aviation'], summary: 'Record flight departure' },
  })

  .post('/flights/:id/arrive', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      arriveFlightCommand({
        flightId: params.id, orgId: user.orgId,
        ...(body.actual_arrival ? { actualArrival: new Date(body.actual_arrival) } : {}),
      }, db)
    )
    return { data: { message: 'Flight arrived.' } }
  }, {
    body: t.Object({ actual_arrival: t.Optional(t.String()) }),
    detail: { tags: ['Aviation'], summary: 'Record flight arrival' },
  })

  .post('/flights/:id/delay', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      transitionFlightCommand({ flightId: params.id, orgId: user.orgId, to: 'DELAYED' }, db)
    )
    return { data: { message: 'Flight delayed.' } }
  }, { detail: { tags: ['Aviation'], summary: 'Mark flight as delayed' } })

  .post('/flights/:id/assign-crew', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      assignAviationCrewCommand({
        orgId: user.orgId, flightId: params.id, role: body.role,
        ...(body.employee_id ? { employeeId: body.employee_id } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      role:        t.Union([t.Literal('CAPTAIN'), t.Literal('FIRST_OFFICER'), t.Literal('LOADMASTER')]),
      employee_id: t.Optional(t.String()),
    }),
    detail: { tags: ['Aviation'], summary: 'Assign crew to flight' },
  })

  .post('/aircraft/:id/aog', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      declareAogCommand({
        aircraftId: params.id, orgId: user.orgId,
        ...(body.flight_id ? { flightId: body.flight_id } : {}),
      }, db)
    )
    return { data: { message: 'AOG declared.' } }
  }, {
    body: t.Object({ flight_id: t.Optional(t.String()) }),
    detail: { tags: ['Aviation'], summary: 'Declare aircraft on ground (AOG)' },
  })
