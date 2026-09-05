import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { parsePaginationQuery } from '@/shared/pagination/query-helpers'
import { listCrewsQuery, listCrewMembersQuery } from '@/modules/workforce/application/queries/workforce.queries'
import { createShiftCommand, scheduleShiftCommand, createCrewCommand, addCrewMemberCommand } from '@/modules/workforce/application/commands/workforce-resources.command'

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

  // P3R-06 FIX: roster — assign employee to shift on a date
  .post('/shift-schedules', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      scheduleShiftCommand({
        orgId: user.orgId, employeeId: body.employee_id,
        shiftId: body.shift_id, date: body.date,
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      employee_id: t.String(),
      shift_id:    t.String(),
      date:        t.String(),
    }),
    detail: { tags: ['Workforce'], summary: 'Schedule employee to shift' },
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

  .get('/crews/:id/members', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => listCrewMembersQuery(params.id, db))
    return { data: result }
  }, { detail: { tags: ['Workforce'], summary: 'List crew members' } })