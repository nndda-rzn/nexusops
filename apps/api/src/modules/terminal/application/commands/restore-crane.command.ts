import { cranes } from '@/shared/database/schema/terminal'
import { eq, and } from 'drizzle-orm'
import { CraneNotFoundError } from '@/modules/terminal/domain/errors/crane.errors'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export interface RestoreCraneCommand {
  orgId: string
  craneId: string
  restoredBy: string
}

export async function restoreCraneCommand(
  cmd: RestoreCraneCommand,
  db: DbContext
): Promise<void> {
  const event = await db.transaction(async (tx) => {
    const [crane] = await tx.select().from(cranes)
      .where(and(eq(cranes.id, cmd.craneId), eq(cranes.orgId, cmd.orgId)))
      .limit(1)

    if (!crane) throw new CraneNotFoundError(cmd.craneId)

    const now = new Date()
    await tx.update(cranes)
      .set({ status: 'AVAILABLE', currentBerthId: null, updatedAt: now })
      .where(and(eq(cranes.id, cmd.craneId), eq(cranes.orgId, cmd.orgId)))

    return {
    type: 'crane.restored' as const,
    orgId: cmd.orgId,
    craneId: cmd.craneId,
    craneCode: crane.code,
    occurredAt: now,
    restoredBy: cmd.restoredBy,
    }
  })

  await eventBus.emit('crane.restored', event)
}
