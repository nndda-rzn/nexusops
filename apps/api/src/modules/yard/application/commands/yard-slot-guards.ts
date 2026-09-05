import { slots, blocks } from '@/shared/database/schema/yard'
import { eq, and, sql } from 'drizzle-orm'
import { DomainError } from '@/shared/errors'
import type { DbContext } from '@/shared/database/client'

// Lookup the yardId owning a slot (via its block) for event payloads
export async function findYardIdForSlot(slotId: string, db: DbContext): Promise<string> {
  const [row] = await db.select({ yardId: blocks.yardId }).from(slots)
    .innerJoin(blocks, eq(blocks.id, slots.blockId))
    .where(eq(slots.id, slotId)).limit(1)
  return row?.yardId ?? ''
}

// Throw if the container is already placed in another occupied slot
export async function assertContainerNotInYard(
  containerId: string, orgId: string, excludeSlotId: string | undefined, db: DbContext
): Promise<void> {
  const conditions = [eq(slots.orgId, orgId), eq(slots.status, 'OCCUPIED'), eq(slots.containerId, containerId)]
  if (excludeSlotId) conditions.push(sql`${slots.id} != ${excludeSlotId}`)
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(slots)
    .where(and(...conditions)).limit(1)
  if ((row?.count ?? 0) > 0) {
    throw new DomainError('container-already-in-yard', 'Container Already In Yard',
      `Container '${containerId}' is already placed in another slot.`, { container_id: containerId })
  }
}
