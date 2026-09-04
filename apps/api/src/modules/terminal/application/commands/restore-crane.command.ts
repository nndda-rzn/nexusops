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
  const [crane] = await db.select().from(cranes)
    .where(and(eq(cranes.id, cmd.craneId), eq(cranes.orgId, cmd.orgId)))
    .limit(1)

  if (!crane) throw new CraneNotFoundError(cmd.craneId)

  await db.update(cranes)
    .set({ status: 'AVAILABLE', currentBerthId: null, updatedAt: new Date() })
    .where(eq(cranes.id, cmd.craneId))

  await eventBus.emit('crane.restored', {
    type: 'crane.restored',
    orgId: cmd.orgId,
    craneId: cmd.craneId,
    craneCode: crane.code,
    occurredAt: new Date(),
    restoredBy: cmd.restoredBy,
  })
}
