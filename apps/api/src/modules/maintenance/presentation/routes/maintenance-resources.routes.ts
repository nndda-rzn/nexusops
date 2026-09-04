import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { parsePaginationQuery } from '@/shared/pagination/query-helpers'
import { listFailuresQuery, listSparePartsQuery, listMaintenancePlansQuery } from '@/modules/maintenance/application/queries/maintenance.queries'
import { reportFailureCommand, createMaintenancePlanCommand, createSparePartCommand } from '@/modules/maintenance/application/commands/maintenance-resources.command'

export const maintenanceResourcesRoutes = new Elysia({ prefix: '/maintenance' })
  .use(authMiddleware)

  .get('/failures', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listFailuresQuery(user.orgId, db, {
        ...parsePaginationQuery(query),
        ...(query.asset_id ? { assetId: query.asset_id } : {}),
      })
    )
    return result
  }, {
    query: t.Object({ page: t.Optional(t.String()), limit: t.Optional(t.String()), asset_id: t.Optional(t.String()) }),
    detail: { tags: ['Maintenance'], summary: 'List failures' },
  })

  .post('/failures', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      reportFailureCommand({
        orgId: user.orgId, assetId: body.asset_id,
        failureType: body.failure_type, description: body.description,
        severity: body.severity, detectedAt: new Date(body.detected_at),
        ...(body.detected_by ? { detectedBy: body.detected_by } : {}),
        ...(body.downtime_start ? { downtimeStart: new Date(body.downtime_start) } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      asset_id:      t.String(),
      failure_type:  t.String(),
      description:   t.String(),
      severity:      t.Union([t.Literal('MINOR'), t.Literal('MAJOR'), t.Literal('CRITICAL')]),
      detected_at:   t.String(),
      detected_by:   t.Optional(t.String()),
      downtime_start: t.Optional(t.String()),
    }),
    detail: { tags: ['Maintenance'], summary: 'Report failure' },
  })

  .get('/spare-parts', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listSparePartsQuery(user.orgId, db, parsePaginationQuery(query))
    )
    return result
  }, {
    query: t.Object({ page: t.Optional(t.String()), limit: t.Optional(t.String()) }),
    detail: { tags: ['Maintenance'], summary: 'List spare parts' },
  })

  .post('/spare-parts', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      createSparePartCommand({
        orgId: user.orgId, partNumber: body.part_number, name: body.name,
        ...(body.quantity_on_hand ? { quantityOnHand: body.quantity_on_hand } : {}),
        ...(body.reorder_point ? { reorderPoint: body.reorder_point } : {}),
        ...(body.unit_cost ? { unitCost: body.unit_cost } : {}),
        ...(body.supplier ? { supplier: body.supplier } : {}),
        ...(body.lead_time_days !== undefined ? { leadTimeDays: body.lead_time_days } : {}),
        ...(body.location ? { location: body.location } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      part_number:      t.String(),
      name:             t.String(),
      quantity_on_hand: t.Optional(t.String()),
      reorder_point:    t.Optional(t.String()),
      unit_cost:        t.Optional(t.String()),
      supplier:         t.Optional(t.String()),
      lead_time_days:   t.Optional(t.Number()),
      location:         t.Optional(t.String()),
    }),
    detail: { tags: ['Maintenance'], summary: 'Create spare part' },
  })

  .post('/plans', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      createMaintenancePlanCommand({
        orgId: user.orgId, assetId: body.asset_id,
        planType: body.plan_type,
        createdBy: user.id,
        ...(body.interval_days !== undefined ? { intervalDays: body.interval_days } : {}),
        ...(body.interval_hours ? { intervalHours: body.interval_hours } : {}),
        ...(body.estimated_duration_hours ? { estimatedDurationHours: body.estimated_duration_hours } : {}),
        ...(body.next_due_date ? { nextDueDate: body.next_due_date } : {}),
        ...(body.tasks ? { tasks: body.tasks } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      asset_id:                   t.String(),
      plan_type:                  t.Union([t.Literal('TIME_BASED'), t.Literal('USAGE_BASED'), t.Literal('CONDITION_BASED')]),
      interval_days:              t.Optional(t.Number()),
      interval_hours:             t.Optional(t.String()),
      estimated_duration_hours:   t.Optional(t.String()),
      next_due_date:              t.Optional(t.String()),
      tasks:                      t.Optional(t.Unknown()),
    }),
    detail: { tags: ['Maintenance'], summary: 'Create maintenance plan' },
  })

  .get('/plans/:assetId', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listMaintenancePlansQuery(user.orgId, params.assetId, db)
    )
    return { data: result }
  }, { detail: { tags: ['Maintenance'], summary: 'List maintenance plans for asset' } })
