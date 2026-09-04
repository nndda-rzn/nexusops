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
  const [crane] = await db.select().from(cranes)
    .where(and(eq(cranes.id, cmd.craneId), eq(cranes.orgId, cmd.orgId)))
    .limit(1)

  if (!crane) throw new CraneNotFoundError(cmd.craneId)

  await db.update(cranes)
    .set({ status: 'BREAKDOWN', updatedAt: new Date() })
    .where(eq(cranes.id, cmd.craneId))

  await eventBus.emit('crane.breakdown', {
    type: 'crane.breakdown',
    orgId: cmd.orgId,
    craneId: cmd.craneId,
    craneCode: crane.code,
    reason: cmd.reason,
    occurredAt: new Date(),
    reportedBy: cmd.reportedBy,
  })
}
