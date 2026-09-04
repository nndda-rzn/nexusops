import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { parsePaginationQuery } from '@/shared/pagination/query-helpers'
import { listAssetsQuery, getAssetQuery, listCategoriesQuery } from '@/modules/assets/application/queries/assets.queries'
import { registerAssetCommand } from '@/modules/assets/application/commands/register-asset.command'
import { updateAssetStatusCommand } from '@/modules/assets/application/commands/update-asset-status.command'
import { createAssetCategoryCommand } from '@/modules/assets/application/commands/asset-operations.command'
import type { AssetStatus } from '@/modules/assets/domain/entities/asset.entity'

export const assetsRoutes = new Elysia({ prefix: '/assets' })
  .use(authMiddleware)

  .get('/categories', async ({ user }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => listCategoriesQuery(user.orgId, db))
    return { data: result }
  }, { detail: { tags: ['Assets'], summary: 'List asset categories' } })

  .post('/categories', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      createAssetCategoryCommand({
        orgId: user.orgId, code: body.code, name: body.name,
        ...(body.parent_category_id ? { parentCategoryId: body.parent_category_id } : {}),
        ...(body.maintenance_interval_days !== undefined ? { maintenanceIntervalDays: body.maintenance_interval_days } : {}),
        ...(body.inspection_required !== undefined ? { inspectionRequired: body.inspection_required } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      code:                      t.String(),
      name:                      t.String(),
      parent_category_id:        t.Optional(t.String()),
      maintenance_interval_days: t.Optional(t.Number()),
      inspection_required:       t.Optional(t.Boolean()),
    }),
    detail: { tags: ['Assets'], summary: 'Create asset category' },
  })

  .get('/assets', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listAssetsQuery(user.orgId, db, {
        ...parsePaginationQuery(query),
        ...(query.status ? { status: query.status } : {}),
        ...(query.category_id ? { categoryId: query.category_id } : {}),
      })
    )
    return result
  }, {
    query: t.Object({
      page:        t.Optional(t.String()),
      limit:       t.Optional(t.String()),
      category_id: t.Optional(t.String()),
      status:      t.Optional(t.Union([
        t.Literal('ACTIVE'), t.Literal('IDLE'), t.Literal('ASSIGNED_OUT'),
        t.Literal('MAINTENANCE'), t.Literal('BREAKDOWN'), t.Literal('INSPECTION'),
        t.Literal('DECOMMISSIONED'), t.Literal('DISPOSED'),
      ])),
    }),
    detail: { tags: ['Assets'], summary: 'List assets' },
  })

  .get('/assets/:id', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) => getAssetQuery(params.id, user.orgId, db))
    return { data: result }
  }, { detail: { tags: ['Assets'], summary: 'Get asset by ID' } })

  .post('/assets', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      registerAssetCommand({
        orgId: user.orgId, assetNumber: body.asset_number,
        name: body.name, ownerOrgId: user.orgId,
        ...(body.category_id ? { categoryId: body.category_id } : {}),
        ...(body.serial_number ? { serialNumber: body.serial_number } : {}),
        ...(body.manufacturer ? { manufacturer: body.manufacturer } : {}),
        ...(body.model ? { model: body.model } : {}),
        ...(body.year_manufactured !== undefined ? { yearManufactured: body.year_manufactured } : {}),
        ...(body.year_acquired !== undefined ? { yearAcquired: body.year_acquired } : {}),
        ...(body.acquisition_cost ? { acquisitionCost: body.acquisition_cost } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      asset_number:      t.String(),
      name:              t.String(),
      category_id:       t.Optional(t.String()),
      serial_number:     t.Optional(t.String()),
      manufacturer:      t.Optional(t.String()),
      model:             t.Optional(t.String()),
      year_manufactured: t.Optional(t.Number()),
      year_acquired:     t.Optional(t.Number()),
      acquisition_cost:  t.Optional(t.String()),
    }),
    detail: { tags: ['Assets'], summary: 'Register asset' },
  })

  .patch('/assets/:id/status', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      updateAssetStatusCommand({
        assetId: params.id, orgId: user.orgId,
        status: body.status as AssetStatus, actorId: user.id,
      }, db)
    )
    return { data: { message: 'Asset status updated.' } }
  }, {
    body: t.Object({
      status: t.Union([
        t.Literal('ACTIVE'), t.Literal('IDLE'), t.Literal('ASSIGNED_OUT'),
        t.Literal('MAINTENANCE'), t.Literal('BREAKDOWN'), t.Literal('INSPECTION'),
        t.Literal('DECOMMISSIONED'), t.Literal('DISPOSED'),
      ]),
    }),
    detail: { tags: ['Assets'], summary: 'Update asset status' },
  })
