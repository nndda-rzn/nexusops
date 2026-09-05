import { resourceAllocations } from '@/shared/database/schema/planning'
import { eq, and, sql } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { DomainError, DomainNotFoundError } from '@/shared/errors'
import type { DbContext } from '@/shared/database/client'

export type AllocationStatus = 'PLANNED' | 'CONFIRMED' | 'IN_USE' | 'RELEASED'

const VALID_TRANSITIONS: Record<AllocationStatus, AllocationStatus[]> = {
  PLANNED:   ['CONFIRMED', 'RELEASED'],
  CONFIRMED: ['IN_USE', 'RELEASED', 'PLANNED'],
  IN_USE:    ['RELEASED'],
  RELEASED:  [],
}

export interface CreateAllocationCommand {
  orgId: string
  planId?: string | undefined
  resourceType: string
  resourceId: string
  allocatedToType: string
  allocatedToId: string
  startTime: Date
  endTime: Date
  quantity?: number | undefined
  createdBy: string
}

// Enforce no-overlap on the SAME resource during an active window.
export async function createAllocationCommand(cmd: CreateAllocationCommand, db: DbContext): Promise<{ id: string }> {
  if (cmd.endTime <= cmd.startTime) {
    throw new DomainError('invalid-allocation-window', 'Invalid Allocation Window',
      'endTime must be after startTime.', { resource_type: cmd.resourceType, resource_id: cmd.resourceId })
  }

  const conflicts = await db.select({ id: resourceAllocations.id }).from(resourceAllocations)
    .where(and(
      eq(resourceAllocations.orgId, cmd.orgId),
      eq(resourceAllocations.resourceType, cmd.resourceType),
      eq(resourceAllocations.resourceId, cmd.resourceId),
      sql`${resourceAllocations.status} != 'RELEASED'`,
      sql`${resourceAllocations.startTime} < ${cmd.endTime}`,
      sql`${resourceAllocations.endTime} > ${cmd.startTime}`,
    ))
    .limit(1)
  if (conflicts.length > 0) {
    throw new DomainError('resource-allocation-conflict', 'Resource Allocation Conflict',
      `Resource '${cmd.resourceType}:${cmd.resourceId}' already has an allocation overlapping ` +
      `${cmd.startTime.toISOString()}–${cmd.endTime.toISOString()}.`,
      { resource_type: cmd.resourceType, resource_id: cmd.resourceId })
  }

  const id = generateId()
  const now = new Date()
  await db.insert(resourceAllocations).values({
    id, orgId: cmd.orgId, planId: cmd.planId ?? null,
    resourceType: cmd.resourceType, resourceId: cmd.resourceId,
    allocatedToType: cmd.allocatedToType, allocatedToId: cmd.allocatedToId,
    startTime: cmd.startTime, endTime: cmd.endTime,
    quantity: cmd.quantity ?? 1, status: 'PLANNED', version: 1,
    createdBy: cmd.createdBy, createdAt: now, updatedAt: now,
  })
  return { id }
}

export interface UpdateAllocationStatusCommand {
  orgId: string
  allocationId: string
  to: AllocationStatus
  expectedVersion: number
  actorId: string
}

// Optimistic lock: version must match — concurrent updates rejected.
export async function updateAllocationStatusCommand(cmd: UpdateAllocationStatusCommand, db: DbContext): Promise<void> {
  const [row] = await db.select().from(resourceAllocations)
    .where(and(eq(resourceAllocations.id, cmd.allocationId), eq(resourceAllocations.orgId, cmd.orgId)))
    .limit(1)
  if (!row) throw new DomainNotFoundError('allocation-not-found', 'Allocation Not Found',
    `Allocation '${cmd.allocationId}' does not exist.`, { allocation_id: cmd.allocationId })
  if (row.version !== cmd.expectedVersion) {
    throw new DomainError('allocation-version-conflict', 'Allocation Version Conflict',
      `Allocation '${cmd.allocationId}' was modified by another actor (expected v${cmd.expectedVersion}, got v${row.version}).`,
      { allocation_id: cmd.allocationId, expected: cmd.expectedVersion, current: row.version })
  }
  const allowed = VALID_TRANSITIONS[row.status as AllocationStatus] ?? []
  if (!allowed.includes(cmd.to)) {
    throw new DomainError('allocation-invalid-transition', 'Allocation Invalid Transition',
      `Cannot transition allocation from '${row.status}' to '${cmd.to}'.`,
      { allocation_id: cmd.allocationId, from: row.status, to: cmd.to })
  }

  await db.update(resourceAllocations)
    .set({ status: cmd.to, version: sql`${resourceAllocations.version} + 1`, updatedAt: new Date() })
    .where(and(eq(resourceAllocations.id, cmd.allocationId), eq(resourceAllocations.orgId, cmd.orgId)))
}

export async function listAllocationsQuery(
  orgId: string, db: DbContext,
  params?: { resourceType?: string; resourceId?: string; status?: AllocationStatus }
) {
  const conditions = [eq(resourceAllocations.orgId, orgId)]
  if (params?.resourceType) conditions.push(eq(resourceAllocations.resourceType, params.resourceType))
  if (params?.resourceId) conditions.push(eq(resourceAllocations.resourceId, params.resourceId))
  if (params?.status) conditions.push(eq(resourceAllocations.status, params.status))
  return db.select().from(resourceAllocations).where(and(...conditions)).orderBy(resourceAllocations.startTime)
}