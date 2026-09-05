import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { parsePaginationQuery } from '@/shared/pagination/query-helpers'
import { listAssignmentsQuery } from '@/modules/workforce/application/queries/workforce.queries'
import { createAssignmentCommand, completeAssignmentCommand } from '@/modules/workforce/application/commands/assignment.command'

export const workforceAssignmentsRoutes = new Elysia({ prefix: '/workforce' })
  .use(authMiddleware)

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