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
  const [hold] = await db
    .select()
    .from(containerHolds)
    .where(and(
      eq(containerHolds.id, cmd.holdId),
      eq(containerHolds.containerId, cmd.containerId),
      eq(containerHolds.status, 'ACTIVE'),
    ))
    .limit(1)

  if (!hold) throw new NotFoundError('ContainerHold', cmd.holdId)

  await db.update(containerHolds)
    .set({
      status: 'RELEASED',
      releasedBy: cmd.releasedBy,
      releasedAt: new Date(),
    })
    .where(eq(containerHolds.id, cmd.holdId))

  await eventBus.emit('container.released', {
    type: 'container.released',
    containerId: cmd.containerId,
    orgId: cmd.orgId,
    holdId: cmd.holdId,
    holdType: hold.holdType,
    occurredAt: new Date(),
    actorId: cmd.releasedBy,
  })
}
