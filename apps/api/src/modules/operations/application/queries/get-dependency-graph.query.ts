import type { DbContext } from '@/shared/database/client'
import { operationDependencies, operations } from '@/shared/database/schema/operations'
import { eq, or, and, inArray } from 'drizzle-orm'

export interface GetDependencyGraphQuery {
  orgId: string
  operationId: string
}

export interface DependencyNode {
  id: string
  type: string
  status: string
  scheduledStart?: Date | undefined
  delayMinutes: number
  isCrossEntity: boolean
}

export interface DependencyEdge {
  from: string
  to: string
  dependencyType: string
  isCrossEntity: boolean
}

export interface DependencyGraph {
  nodes: DependencyNode[]
  edges: DependencyEdge[]
  criticalPath: string[]
}

export async function getDependencyGraphQuery(
  query: GetDependencyGraphQuery,
  db: DbContext
): Promise<DependencyGraph> {
  // Get all dependencies where this operation is involved
  const deps = await db
    .select()
    .from(operationDependencies)
    .where(or(
      eq(operationDependencies.operationId, query.operationId),
      eq(operationDependencies.dependsOnId, query.operationId),
    ))

  // Collect unique operation IDs in the graph
  const opIds = new Set<string>([query.operationId])
  for (const dep of deps) {
    opIds.add(dep.operationId)
    opIds.add(dep.dependsOnId)
  }

  // Q-07 FIX: load operations filtered by orgId to prevent cross-tenant exposure
  // Cross-entity dependencies (dependsOnOrgId !== orgId) only show minimal data
  const ops = await db
    .select({
      id: operations.id,
      type: operations.type,
      status: operations.status,
      scheduledStart: operations.scheduledStart,
      delayMinutes: operations.delayMinutes,
      isCrossEntity: operations.isCrossEntity,
      orgId: operations.orgId,
    })
    .from(operations)
    .where(and(
      inArray(operations.id, Array.from(opIds)),
      eq(operations.orgId, query.orgId),   // ← orgId filter added
    ))

  // For cross-entity deps, include placeholder node with minimal info
  const crossEntityIds = deps
    .filter(d => d.dependsOnOrgId !== query.orgId)
    .map(d => d.dependsOnId)

  const nodes: DependencyNode[] = [
    ...ops.map(op => ({
      id: op.id,
      type: op.type,
      status: op.status,
      scheduledStart: op.scheduledStart ?? undefined,
      delayMinutes: op.delayMinutes,
      isCrossEntity: op.isCrossEntity,
    })),
    // Placeholder nodes for cross-entity ops (minimal data only)
    ...crossEntityIds.filter(id => !ops.find(o => o.id === id)).map(id => ({
      id,
      type: 'CROSS_ENTITY',
      status: 'UNKNOWN',
      scheduledStart: undefined,
      delayMinutes: 0,
      isCrossEntity: true,
    })),
  ]

  const edges: DependencyEdge[] = deps.map(dep => ({
    from: dep.dependsOnId,
    to: dep.operationId,
    dependencyType: dep.dependencyType,
    isCrossEntity: dep.dependsOnOrgId !== query.orgId,
  }))

  const criticalPath = computeCriticalPath(nodes, edges, query.operationId)

  return { nodes, edges, criticalPath }
}

function computeCriticalPath(
  nodes: DependencyNode[],
  edges: DependencyEdge[],
  startId: string
): string[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const downstream = new Map<string, string[]>()

  for (const edge of edges) {
    const list = downstream.get(edge.from) ?? []
    list.push(edge.to)
    downstream.set(edge.from, list)
  }

  const visited = new Set<string>()
  let maxDelay = 0
  let bestPath: string[] = []

  function dfs(nodeId: string, currentPath: string[], cumulativeDelay: number): void {
    if (visited.has(nodeId)) return
    visited.add(nodeId)
    const node = nodeMap.get(nodeId)
    const delay = cumulativeDelay + (node?.delayMinutes ?? 0)
    currentPath.push(nodeId)
    const children = downstream.get(nodeId) ?? []
    if (children.length === 0) {
      if (delay > maxDelay) { maxDelay = delay; bestPath = [...currentPath] }
    } else {
      for (const child of children) dfs(child, currentPath, delay)
    }
    currentPath.pop()
    visited.delete(nodeId)
  }

  dfs(startId, [], 0)
  return bestPath
}
