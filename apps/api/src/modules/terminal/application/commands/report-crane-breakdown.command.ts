import { cranes } from '@/shared/database/schema/terminal'
import { eq, and } from 'drizzle-orm'
import { eventBus } from '@/shared/events'
import { CraneNotFoundError } from '@/modules/terminal/domain/errors/crane.errors'
import type { DbContext } from '@/shared/database/client'

export interface ReportCraneBreakdownCommand {
  orgId: string
  craneId: string
  reportedBy: string
  reason: string
}

export async function reportCraneBreakdownCommand(
  cmd: ReportCraneBreakdownCommand,
  db: DbContext
): Promise<void> {
  const event = await db.transaction(async (tx) => {
    const [crane] = await tx.select().from(cranes)
      .where(and(eq(cranes.id, cmd.craneId), eq(cranes.orgId, cmd.orgId)))
      .limit(1)

    if (!crane) throw new CraneNotFoundError(cmd.craneId)

    const now = new Date()
    await tx.update(cranes)
      .set({ status: 'BREAKDOWN', updatedAt: now })
      .where(and(eq(cranes.id, cmd.craneId), eq(cranes.orgId, cmd.orgId)))

    return {
    type: 'crane.breakdown' as const,
    orgId: cmd.orgId,
    craneId: cmd.craneId,
    craneCode: crane.code,
    reason: cmd.reason,
    occurredAt: now,
    reportedBy: cmd.reportedBy,
    }
  })

  await eventBus.emit('crane.breakdown', event)
}
