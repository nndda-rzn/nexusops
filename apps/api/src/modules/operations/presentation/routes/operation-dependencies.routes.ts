import { Elysia, t } from 'elysia'
import { authMiddleware, withDbContext } from '@/shared/auth/middleware'
import { UnauthorizedError } from '@/shared/errors'
import { addDependencyCommand } from '@/modules/operations/application/commands/add-dependency.command'
import { removeDependencyCommand } from '@/modules/operations/application/commands/remove-dependency.command'
import { getDependencyGraphQuery } from '@/modules/operations/application/queries/get-dependency-graph.query'

export const operationDependencyRoutes = new Elysia({ prefix: '/operations' })
  .use(authMiddleware)

  // GET /operations/:id/dependencies — get dependency graph
  .get('/:id/dependencies', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()

    const graph = await withDbContext(user, (db) =>
      getDependencyGraphQuery({ orgId: user.orgId, operationId: params.id }, db)
    )

    return { data: graph }
  }, {
    detail: { tags: ['Operations'], summary: 'Get operation dependency graph' },
  })

  // POST /operations/:id/dependencies — add dependency
  .post('/:id/dependencies', async ({ user, params, body }) => {
    if (!user) throw new UnauthorizedError()

    await withDbContext(user, (db) =>
      addDependencyCommand({
        orgId: user.orgId,
        operationId: params.id,
        dependsOnId: body.depends_on_id,
        dependsOnOrgId: body.depends_on_org_id ?? user.orgId,
        dependencyType: body.dependency_type as 'FINISH_TO_START' | undefined,
        createdBy: user.id,
      }, db)
    )

    return { data: { message: 'Dependency added.' } }
  }, {
    body: t.Object({
      depends_on_id:     t.String(),
      depends_on_org_id: t.Optional(t.String()),
      dependency_type:   t.Optional(t.String()),
    }),
    detail: { tags: ['Operations'], summary: 'Add operation dependency' },
  })

  // DELETE /operations/:id/dependencies/:dependsOnId — remove dependency
  .delete('/:id/dependencies/:dependsOnId', async ({ user, params }) => {
    if (!user) throw new UnauthorizedError()

    await withDbContext(user, (db) =>
      removeDependencyCommand({
        orgId: user.orgId,
        operationId: params.id,
        dependsOnId: params.dependsOnId,
      }, db)
    )

    return { data: { message: 'Dependency removed.' } }
  }, {
    detail: { tags: ['Operations'], summary: 'Remove operation dependency' },
  })
