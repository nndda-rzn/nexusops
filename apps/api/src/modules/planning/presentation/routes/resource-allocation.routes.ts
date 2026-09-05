import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext, requireModule } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { createAllocationCommand, updateAllocationStatusCommand, listAllocationsQuery } from '@/modules/planning/application/commands/resource-allocation.commands'
import type { AllocationStatus } from '@/modules/planning/application/commands/resource-allocation.commands'

const STATUSES = t.Union([
  t.Literal('PLANNED'), t.Literal('CONFIRMED'), t.Literal('IN_USE'), t.Literal('RELEASED'),
])

export const planningAllocationRoutes = new Elysia({ prefix: '/planning' })
  .use(authMiddleware)
  .onBeforeHandle(requireModule('planning'))

  .post('/allocations', async ({ user, body }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      createAllocationCommand({
        orgId: user.orgId,
        resourceType: body.resource_type, resourceId: body.resource_id,
        allocatedToType: body.allocated_to_type, allocatedToId: body.allocated_to_id,
        startTime: new Date(body.start_time), endTime: new Date(body.end_time),
        createdBy: user.id,
        ...(body.plan_id ? { planId: body.plan_id } : {}),
        ...(body.quantity !== undefined ? { quantity: body.quantity } : {}),
      }, db)
    )
    return { data: result }
  }, {
    body: t.Object({
      resource_type: t.String(),
      resource_id: t.String(),
      allocated_to_type: t.String(),
      allocated_to_id: t.String(),
      start_time: t.String(),
      end_time: t.String(),
      plan_id: t.Optional(t.String()),
      quantity: t.Optional(t.Number({ minimum: 1 })),
    }),
    detail: { tags: ['Planning'], summary: 'Create resource allocation (overlap-checked)' },
  })

  .get('/allocations', async ({ user, query }) => {
    if (!user) throw new UnauthorizedError()
    const result = await withDbContext(user, (db) =>
      listAllocationsQuery(user.orgId, db, {
        ...(query.resource_type ? { resourceType: query.resource_type } : {}),
        ...(query.resource_id ? { resourceId: query.resource_id } : {}),
        ...(query.status ? { status: query.status as AllocationStatus } : {}),
      })
    )
    return { data: result }
  }, {
    query: t.Object({
      resource_type: t.Optional(t.String()),
      resource_id: t.Optional(t.String()),
      status: t.Optional(t.String()),
    }),
    detail: { tags: ['Planning'], summary: 'List resource allocations' },
  })

  .post('/allocations/:id/status', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()
    await withDbContext(user, (db) =>
      updateAllocationStatusCommand({
        orgId: user.orgId, allocationId: params.id,
        to: body.status as AllocationStatus,
        expectedVersion: body.expected_version, actorId: user.id,
      }, db)
    )
    return { data: { message: 'Allocation status updated.' } }
  }, {
    body: t.Object({
      status: STATUSES,
      expected_version: t.Number(),
    }),
    detail: { tags: ['Planning'], summary: 'Update allocation status (optimistic lock)' },
  })