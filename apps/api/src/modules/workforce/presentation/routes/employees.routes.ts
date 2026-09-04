import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { parsePaginationQuery } from '@/shared/pagination/query-helpers'
import { listEmployeesQuery, getEmployeeQuery } from '@/modules/workforce/application/queries/workforce.queries'
import { registerEmployeeCommand } from '@/modules/workforce/application/commands/register-employee.command'
import { updateEmployeeStatusCommand } from '@/modules/workforce/application/commands/update-employee-status.command'

export const employeesRoutes = new Elysia({ prefix: '/workforce' })
  .use(authMiddleware)

  .get('/employees', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listEmployeesQuery(user.orgId, db, {
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
        t.Literal('ACTIVE'), t.Literal('INACTIVE'),
        t.Literal('SUSPENDED'), t.Literal('RESIGNED'),
      ])),
    }),
    detail: { tags: ['Workforce'], summary: 'List employees' },
  })

  .get('/employees/:id', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => getEmployeeQuery(params.id, user.orgId, db))
    return { data: result }
  }, { detail: { tags: ['Workforce'], summary: 'Get employee by ID' } })

  .post('/employees', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      registerEmployeeCommand({
        orgId: user.orgId,
        employeeNumber: body.employee_number,
        name: body.name, email: body.email,
        type: body.type, joinDate: body.join_date,
        ...(body.phone ? { phone: body.phone } : {}),
        ...(body.department ? { department: body.department } : {}),
        ...(body.position ? { position: body.position } : {}),
        ...(body.user_id ? { userId: body.user_id } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      employee_number: t.String(),
      name:            t.String(),
      email:           t.String({ format: 'email' }),
      type:            t.Union([t.Literal('PERMANENT'), t.Literal('CONTRACT'), t.Literal('OUTSOURCE')]),
      join_date:       t.String(),
      phone:           t.Optional(t.String()),
      department:      t.Optional(t.String()),
      position:        t.Optional(t.String()),
      user_id:         t.Optional(t.String()),
    }),
    detail: { tags: ['Workforce'], summary: 'Register employee' },
  })

  .patch('/employees/:id/status', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      updateEmployeeStatusCommand({
        employeeId: params.id, orgId: user.orgId,
        status: body.status, actorId: user.id,
      }, db)
    )
    return { data: { message: 'Employee status updated.' } }
  }, {
    body: t.Object({
      status: t.Union([
        t.Literal('ACTIVE'), t.Literal('INACTIVE'),
        t.Literal('SUSPENDED'), t.Literal('RESIGNED'),
      ]),
    }),
    detail: { tags: ['Workforce'], summary: 'Update employee status' },
  })
