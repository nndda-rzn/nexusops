import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { parsePaginationQuery } from '@/shared/pagination/query-helpers'
import { listCrewsQuery, listAssignmentsQuery } from '@/modules/workforce/application/queries/workforce.queries'
import { createShiftCommand, createCrewCommand, addCrewMemberCommand } from '@/modules/workforce/application/commands/workforce-resources.command'
import { createAssignmentCommand, completeAssignmentCommand } from '@/modules/workforce/application/commands/assignment.command'

export const workforceResourcesRoutes = new Elysia({ prefix: '/workforce' })
  .use(authMiddleware)

  // ─── Shifts ───
  .post('/shifts', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      createShiftCommand({
        orgId: user.orgId, name: body.name,
        startTime: body.start_time, endTime: body.end_time,
        durationHours: body.duration_hours, shiftType: body.shift_type,
        ...(body.break_duration_minutes !== undefined ? { breakDurationMinutes: body.break_duration_minutes } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      name:                   t.String(),
      start_time:             t.String(),
      end_time:               t.String(),
      duration_hours:         t.Number({ minimum: 1 }),
      shift_type:             t.Union([t.Literal('DAY'), t.Literal('EVENING'), t.Literal('NIGHT'), t.Literal('ROTATING')]),
      break_duration_minutes: t.Optional(t.Number()),
    }),
    detail: { tags: ['Workforce'], summary: 'Create shift' },
  })

  // ─── Crews ───
  .get('/crews', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listCrewsQuery(user.orgId, db, parsePaginationQuery(query))
    )
    return result
  }, {
    query: t.Object({ page: t.Optional(t.String()), limit: t.Optional(t.String()) }),
    detail: { tags: ['Workforce'], summary: 'List crews' },
  })

  .post('/crews', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      createCrewCommand({
        orgId: user.orgId, name: body.name,
        crewType: body.crew_type,
        ...(body.leader_id ? { leaderId: body.leader_id } : {}),
        ...(body.shift_id ? { shiftId: body.shift_id } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      name:      t.String(),
      crew_type: t.Union([
        t.Literal('CRANE'), t.Literal('STEVEDORE'), t.Literal('GATE'),
        t.Literal('YARD'), t.Literal('WAREHOUSE'), t.Literal('RAIL'), t.Literal('ROAD'),
      ]),
      leader_id: t.Optional(t.String()),
      shift_id:  t.Optional(t.String()),
    }),
    detail: { tags: ['Workforce'], summary: 'Create crew' },
  })

  .post('/crews/:id/members', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      addCrewMemberCommand({ crewId: params.id, employeeId: body.employee_id, role: body.role }, db)
    )
    return { data: result }
  }, {
    body: t.Object({ employee_id: t.String(), role: t.String() }),
    detail: { tags: ['Workforce'], summary: 'Add member to crew' },
  })

  // ─── Assignments ───
  .get('/assignments', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listAssignmentsQuery(user.orgId, db, {
        ...parsePaginationQuery(query),
        ...(query.status ? { status: query.status } : {}),
      })
    )
    return result
  }, {
    query: t.Object({
      page:   t.Optional(t.String()),
      limit:  t.Optional(t.String()),
      status: t.Optional(t.Union([
        t.Literal('PLANNED'), t.Literal('CONFIRMED'), t.Literal('IN_PROGRESS'),
        t.Literal('COMPLETED'), t.Literal('CANCELLED'),
      ])),
    }),
    detail: { tags: ['Workforce'], summary: 'List assignments' },
  })

  .post('/assignments', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      createAssignmentCommand({
        orgId: user.orgId,
        assignmentType: body.assignment_type,
        referenceId: body.reference_id, referenceType: body.reference_type,
        scheduledStart: new Date(body.scheduled_start),
        scheduledEnd: new Date(body.scheduled_end),
        ...(body.employee_id ? { employeeId: body.employee_id } : {}),
        ...(body.crew_id ? { crewId: body.crew_id } : {}),
        ...(body.role ? { role: body.role } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      assignment_type: t.Union([
        t.Literal('OPERATION'), t.Literal('CRANE'), t.Literal('GATE'),
        t.Literal('SHIFT'), t.Literal('TRIP'), t.Literal('TRAIN'), t.Literal('FLIGHT'),
      ]),
      reference_id:    t.String(),
      reference_type:  t.String(),
      scheduled_start: t.String(),
      scheduled_end:   t.String(),
      employee_id:     t.Optional(t.String()),
      crew_id:         t.Optional(t.String()),
      role:            t.Optional(t.String()),
    }),
    detail: { tags: ['Workforce'], summary: 'Create assignment' },
  })

  .post('/assignments/:id/complete', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      completeAssignmentCommand({ assignmentId: params.id, orgId: user.orgId }, db)
    )
    return { data: { message: 'Assignment completed.' } }
  }, { detail: { tags: ['Workforce'], summary: 'Complete assignment' } })
