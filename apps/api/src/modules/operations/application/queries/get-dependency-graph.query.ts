import type { DbContext } from "@/shared/database/client";
import {
  operationDependencies,
  operations,
} from "@/shared/database/schema/operations";
import { eq, or, inArray } from "drizzle-orm";

export interface GetDependencyGraphQuery {
  orgId: string;
  operationId: string;
}

export interface DependencyNode {
  id: string;
  type: string;
  status: string;
  scheduledStart?: Date | undefined;
  delayMinutes: number;
}

export interface DependencyEdge {
  from: string;
  to: string;
  dependencyType: string;
  isCrossEntity: boolean;
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  criticalPath: string[];
}

export async function getDependencyGraphQuery(
  query: GetDependencyGraphQuery,
  db: DbContext,
): Promise<DependencyGraph> {
  // Get all dependencies where this operation is involved
  const deps = await db
    .select()
    .from(operationDependencies)
    .where(
      or(
        eq(operationDependencies.operationId, query.operationId),
        eq(operationDependencies.dependsOnId, query.operationId),
      ),
    );

  // Collect all unique operation IDs in the graph
  const opIds = new Set<string>([query.operationId]);
  for (const dep of deps) {
    opIds.add(dep.operationId);
    opIds.add(dep.dependsOnId);
  }

  // Load all operations in the graph
  const ops = await db
    .select({
      id: operations.id,
      type: operations.type,
      status: operations.status,
      scheduledStart: operations.scheduledStart,
      delayMinutes: operations.delayMinutes,
      isCrossEntity: operations.isCrossEntity,
    })
    .from(operations)
    .where(inArray(operations.id, Array.from(opIds)));

  const nodes: DependencyNode[] = ops.map((op) => ({
    id: op.id,
    type: op.type,
    status: op.status,
    scheduledStart: op.scheduledStart ?? undefined,
    delayMinutes: op.delayMinutes,
  }));

  const edges: DependencyEdge[] = deps.map((dep) => ({
    from: dep.dependsOnId,
    to: dep.operationId,
    dependencyType: dep.dependencyType,
    isCrossEntity: dep.dependsOnOrgId !== query.orgId,
  }));

  // Simple critical path — nodes with most downstream dependencies
  const criticalPath = computeCriticalPath(nodes, edges, query.operationId);

  return { nodes, edges, criticalPath };
}

// ─────────────────────────────────────────
// Simple critical path via longest path in DAG
// Returns ordered list of operation IDs on critical path
// ─────────────────────────────────────────
function computeCriticalPath(
  nodes: DependencyNode[],
  edges: DependencyEdge[],
  startId: string,
): string[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Build adjacency list (downstream: dependsOn → operation)
  const downstream = new Map<string, string[]>();
  for (const edge of edges) {
    const list = downstream.get(edge.from) ?? [];
    list.push(edge.to);
    downstream.set(edge.from, list);
  }

  // DFS to find longest path by delay propagation
  const visited = new Set<string>();
  let maxDelay = 0;
  let bestPath: string[] = [];

  function dfs(
    nodeId: string,
    currentPath: string[],
    cumulativeDelay: number,
  ): void {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    const delay = cumulativeDelay + (node?.delayMinutes ?? 0);
    currentPath.push(nodeId);

    const children = downstream.get(nodeId) ?? [];
    if (children.length === 0) {
      if (delay > maxDelay) {
        maxDelay = delay;
        bestPath = [...currentPath];
      }
    } else {
      for (const child of children) {
        dfs(child, currentPath, delay);
      }
    }

    currentPath.pop();
    visited.delete(nodeId);
  }

  dfs(startId, [], 0);
  return bestPath;
}
