import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { startLoadingCommand, completeTrainCommand } from '@/modules/rail/application/commands/train-lifecycle.command'
import { departTrainCommand } from '@/modules/rail/application/commands/depart-train.command'
import { recordTrainArrivalCommand } from '@/modules/rail/application/commands/record-train-arrival.command'
import { delayTrainCommand } from '@/modules/rail/application/commands/delay-train.command'
import { cancelTrainCommand } from '@/modules/rail/application/commands/cancel-train.command'

export const trainLifecycleRoutes = new Elysia({ prefix: '/rail' })
  .use(authMiddleware)

  .post('/trains/:id/load', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      startLoadingCommand({ trainId: params.id, orgId: user.orgId }, db)
    )
    return { data: { message: 'Loading started.' } }
  }, { detail: { tags: ['Rail'], summary: 'Start loading train' } })

  .post('/trains/:id/depart', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      departTrainCommand({
        trainId: params.id, orgId: user.orgId,
        ...(body.actual_departure ? { actualDeparture: new Date(body.actual_departure) } : {}),
      }, db)
    )
    return { data: { message: 'Train departed.' } }
  }, {
    body: t.Object({ actual_departure: t.Optional(t.String()) }),
    detail: { tags: ['Rail'], summary: 'Depart train' },
  })

  .post('/trains/:id/arrive', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      recordTrainArrivalCommand({
        trainId: params.id, orgId: user.orgId,
        ...(body.actual_arrival ? { actualArrival: new Date(body.actual_arrival) } : {}),
      }, db)
    )
    return { data: { message: 'Train arrived.' } }
  }, {
    body: t.Object({ actual_arrival: t.Optional(t.String()) }),
    detail: { tags: ['Rail'], summary: 'Record train arrival' },
  })

  .post('/trains/:id/complete', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      completeTrainCommand({ trainId: params.id, orgId: user.orgId }, db)
    )
    return { data: { message: 'Train completed.' } }
  }, { detail: { tags: ['Rail'], summary: 'Complete train' } })

  .post('/trains/:id/delay', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      delayTrainCommand({
        trainId: params.id, orgId: user.orgId,
        delayMinutes: body.delay_minutes,
        ...(body.reason ? { reason: body.reason } : {}),
      }, db)
    )
    return { data: { message: 'Train delayed.' } }
  }, {
    body: t.Object({ delay_minutes: t.Number({ minimum: 1 }), reason: t.Optional(t.String()) }),
    detail: { tags: ['Rail'], summary: 'Delay train' },
  })

  .post('/trains/:id/cancel', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      cancelTrainCommand({ trainId: params.id, orgId: user.orgId, reason: body.reason }, db)
    )
    return { data: { message: 'Train cancelled.' } }
  }, {
    body: t.Object({ reason: t.String({ minLength: 1 }) }),
    detail: { tags: ['Rail'], summary: 'Cancel train' },
  })
