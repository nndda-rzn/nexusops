import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { listTrainServicesQuery, listTrainsetsQuery } from '@/modules/rail/application/queries/rail-resources.query'
import { createTrainServiceCommand } from '@/modules/rail/application/commands/create-train-service.command'
import { createTrainsetCommand } from '@/modules/rail/application/commands/create-trainset.command'

export const railResourcesRoutes = new Elysia({ prefix: '/rail' })
  .use(authMiddleware)

  // GET /rail/services
  .get('/services', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listTrainServicesQuery(user.orgId, db, {
        ...(query.page ? { page: Number(query.page) } : {}),
        ...(query.limit ? { limit: Number(query.limit) } : {}),
      })
    )
    return result
  }, {
    query: t.Object({ page: t.Optional(t.String()), limit: t.Optional(t.String()) }),
    detail: { tags: ['Rail'], summary: 'List train services' },
  })

  // POST /rail/services
  .post('/services', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      createTrainServiceCommand({
        orgId: user.orgId,
        serviceCode: body.service_code,
        originStationId: body.origin_station_id,
        destinationStationId: body.destination_station_id,
        frequency: body.frequency,
        ...(body.commodity_type ? { commodityType: body.commodity_type } : {}),
        ...(body.operator ? { operator: body.operator } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      service_code:           t.String(),
      origin_station_id:      t.String(),
      destination_station_id: t.String(),
      frequency:              t.Union([t.Literal('DAILY'), t.Literal('WEEKLY'), t.Literal('CUSTOM')]),
      commodity_type:         t.Optional(t.String()),
      operator:               t.Optional(t.String()),
    }),
    detail: { tags: ['Rail'], summary: 'Create train service' },
  })

  // GET /rail/trainsets
  .get('/trainsets', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listTrainsetsQuery(user.orgId, db, {
        ...(query.page ? { page: Number(query.page) } : {}),
        ...(query.limit ? { limit: Number(query.limit) } : {}),
      })
    )
    return result
  }, {
    query: t.Object({ page: t.Optional(t.String()), limit: t.Optional(t.String()) }),
    detail: { tags: ['Rail'], summary: 'List trainsets' },
  })

  // POST /rail/trainsets
  .post('/trainsets', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      createTrainsetCommand({
        orgId: user.orgId,
        trainsetNumber: body.trainset_number,
        ...(body.locomotive_id ? { locomotiveId: body.locomotive_id } : {}),
        ...(body.capacity_teu !== undefined ? { capacityTeu: body.capacity_teu } : {}),
        ...(body.capacity_weight ? { capacityWeight: body.capacity_weight } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      trainset_number:  t.String(),
      locomotive_id:    t.Optional(t.String()),
      capacity_teu:     t.Optional(t.Number()),
      capacity_weight:  t.Optional(t.String()),
    }),
    detail: { tags: ['Rail'], summary: 'Create trainset' },
  })
