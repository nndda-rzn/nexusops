import { containerHolds } from '@/shared/database/schema/containers'
import { eq, and } from 'drizzle-orm'
import { NotFoundError } from '@/shared/errors'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export interface ReleaseHoldCommand {
  containerId: string
  orgId: string
  holdId: string
  releasedBy: string
}

export async function releaseHoldCommand(
  cmd: ReleaseHoldCommand,
  db: DbContext
): Promise<void> {
  const event = await db.transaction(async (tx) => {
    const [hold] = await tx
      .select()
      .from(containerHolds)
      .where(and(
        eq(containerHolds.id, cmd.holdId),
        eq(containerHolds.containerId, cmd.containerId),
        eq(containerHolds.orgId, cmd.orgId),
        eq(containerHolds.status, 'ACTIVE'),
      ))
      .limit(1)

    if (!hold) throw new NotFoundError('ContainerHold', cmd.holdId)

    const now = new Date()
    await tx.update(containerHolds)
      .set({ status: 'RELEASED', releasedBy: cmd.releasedBy, releasedAt: now })
      .where(and(
        eq(containerHolds.id, cmd.holdId),
        eq(containerHolds.orgId, cmd.orgId),
      ))

    return {
    type: 'container.released' as const,
    containerId: cmd.containerId,
    orgId: cmd.orgId,
    holdId: cmd.holdId,
    holdType: hold.holdType,
    occurredAt: now,
    actorId: cmd.releasedBy,
    }
  })

  // Publish only after the transaction has committed.
  await eventBus.emit('container.released', event)
}
