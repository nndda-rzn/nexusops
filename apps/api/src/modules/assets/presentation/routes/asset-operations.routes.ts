import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { listAssetInspectionsQuery } from '@/modules/assets/application/queries/assets.queries'
import { assignAssetOperatorCommand, returnAssetOperatorCommand, recordInspectionCommand } from '@/modules/assets/application/commands/asset-operations.command'

export const assetOperationsRoutes = new Elysia({ prefix: '/assets' })
  .use(authMiddleware)

  .post('/assets/:id/assign-operator', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      assignAssetOperatorCommand({
        assetId: params.id, orgId: user.orgId,
        operatorOrgId: body.operator_org_id,
        assignmentStart: new Date(body.assignment_start),
        approvedBy: user.id,
        ...(body.assignment_end ? { assignmentEnd: new Date(body.assignment_end) } : {}),
        ...(body.internal_rate ? { internalRate: body.internal_rate } : {}),
        ...(body.rate_unit ? { rateUnit: body.rate_unit } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      operator_org_id:  t.String(),
      assignment_start: t.String(),
      assignment_end:   t.Optional(t.String()),
      internal_rate:    t.Optional(t.String()),
      rate_unit:        t.Optional(t.Union([
        t.Literal('PER_MOVE'), t.Literal('PER_HOUR'), t.Literal('PER_KM'), t.Literal('PER_DAY'),
      ])),
    }),
    detail: { tags: ['Assets'], summary: 'Assign asset to operator' },
  })

  .post('/assets/:id/return-operator', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      returnAssetOperatorCommand({
        assetId: params.id, orgId: user.orgId, assignmentId: body.assignment_id,
      }, db)
    )
    return { data: { message: 'Asset returned to owner.' } }
  }, {
    body: t.Object({ assignment_id: t.String() }),
    detail: { tags: ['Assets'], summary: 'Return asset from operator' },
  })

  .get('/assets/:id/inspections', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => listAssetInspectionsQuery(params.id, user.orgId, db))
    return { data: result }
  }, { detail: { tags: ['Assets'], summary: 'List asset inspections' } })

  .post('/assets/:id/inspections', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      recordInspectionCommand({
        assetId: params.id, orgId: user.orgId,
        inspectionType: body.inspection_type, result: body.result,
        inspectedAt: new Date(body.inspected_at),
        ...(body.findings ? { findings: body.findings } : {}),
        ...(body.inspector_id ? { inspectorId: body.inspector_id } : {}),
        ...(body.next_inspection_date ? { nextInspectionDate: body.next_inspection_date } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      inspection_type:      t.Union([
        t.Literal('ROUTINE'), t.Literal('PRE_OPERATION'), t.Literal('POST_OPERATION'),
        t.Literal('ANNUAL'), t.Literal('SPECIAL'),
      ]),
      result:               t.Union([t.Literal('PASS'), t.Literal('FAIL'), t.Literal('CONDITIONAL')]),
      inspected_at:         t.String(),
      findings:             t.Optional(t.String()),
      inspector_id:         t.Optional(t.String()),
      next_inspection_date: t.Optional(t.String()),
    }),
    detail: { tags: ['Assets'], summary: 'Record asset inspection' },
  })
