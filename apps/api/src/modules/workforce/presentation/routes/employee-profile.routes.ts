import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { addQualificationCommand, addCertificationCommand, setAvailabilityCommand } from '@/modules/workforce/application/commands/workforce-resources.command'
import { listCertificationsQuery, getEmployeeAvailabilityQuery } from '@/modules/workforce/application/queries/workforce.queries'

export const employeeProfileRoutes = new Elysia({ prefix: '/workforce' })
  .use(authMiddleware)

  .post('/employees/:id/qualifications', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      addQualificationCommand({
        orgId: user.orgId, employeeId: params.id,
        qualificationType: body.qualification_type, level: body.level,
        acquiredAt: body.acquired_at,
        ...(body.valid_until ? { validUntil: body.valid_until } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      qualification_type: t.String(),
      level:              t.Union([t.Literal('BASIC'), t.Literal('INTERMEDIATE'), t.Literal('ADVANCED'), t.Literal('EXPERT')]),
      acquired_at:        t.String(),
      valid_until:        t.Optional(t.String()),
    }),
    detail: { tags: ['Workforce'], summary: 'Add qualification to employee' },
  })

  .post('/employees/:id/certifications', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      addCertificationCommand({
        orgId: user.orgId, employeeId: params.id,
        certificationName: body.certification_name,
        issuingBody: body.issuing_body,
        certificateNumber: body.certificate_number,
        issuedAt: body.issued_at,
        ...(body.expires_at ? { expiresAt: body.expires_at } : {}),
        ...(body.document_id ? { documentId: body.document_id } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      certification_name:  t.String(),
      issuing_body:        t.String(),
      certificate_number:  t.String(),
      issued_at:           t.String(),
      expires_at:          t.Optional(t.String()),
      document_id:         t.Optional(t.String()),
    }),
    detail: { tags: ['Workforce'], summary: 'Add certification to employee' },
  })

  .get('/employees/:id/certifications', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => listCertificationsQuery(params.id, user.orgId, db))
    return { data: result }
  }, { detail: { tags: ['Workforce'], summary: 'List employee certifications' } })

  .post('/employees/:id/availability', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      setAvailabilityCommand({
        orgId: user.orgId, employeeId: params.id,
        date: body.date, availabilityType: body.availability_type,
        ...(body.notes ? { notes: body.notes } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      date:              t.String(),
      availability_type: t.Union([
        t.Literal('AVAILABLE'), t.Literal('LEAVE'), t.Literal('SICK'),
        t.Literal('OFF'), t.Literal('TRAINING'),
      ]),
      notes:             t.Optional(t.String()),
    }),
    detail: { tags: ['Workforce'], summary: 'Set employee availability' },
  })

  .get('/employees/:id/availability', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => getEmployeeAvailabilityQuery(params.id, user.orgId, db))
    return { data: result }
  }, { detail: { tags: ['Workforce'], summary: 'Get employee availability' } })
