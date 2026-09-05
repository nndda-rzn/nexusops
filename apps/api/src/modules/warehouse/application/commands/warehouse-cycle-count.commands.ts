import { cycleCounts } from '@/shared/database/schema/warehouse'
import { eq, and } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export interface ConductCycleCountCommand {
  orgId: string; warehouseId: string; cycleCountId: string
  itemsCounted: number; discrepanciesFound: number; conductedBy?: string | undefined
}
// P3R-03 FIX: scope update to warehouse — no cross-warehouse conduct
export async function conductCycleCountCommand(cmd: ConductCycleCountCommand, db: DbContext): Promise<void> {
  const now = new Date()
  await db.update(cycleCounts)
    .set({
      status: 'COMPLETED', completedAt: now,
      itemsCounted: cmd.itemsCounted,
      discrepanciesFound: cmd.discrepanciesFound,
      conductedBy: cmd.conductedBy, updatedAt: now,
    })
    .where(and(
      eq(cycleCounts.id, cmd.cycleCountId),
      eq(cycleCounts.warehouseId, cmd.warehouseId),
      eq(cycleCounts.orgId, cmd.orgId),
    ))
  await eventBus.emit('warehouse.cycle_count_completed', {
    type: 'warehouse.cycle_count_completed',
    warehouseId: cmd.warehouseId, orgId: cmd.orgId,
    cycleCountId: cmd.cycleCountId, occurredAt: now,
  })
}

export interface CreateCycleCountCommand {
  orgId: string; warehouseId: string
  countType: 'FULL' | 'PARTIAL' | 'SPOT'; scheduledAt?: Date | undefined
}
export async function createCycleCountCommand(cmd: CreateCycleCountCommand, db: DbContext): Promise<{ id: string }> {
  const id = generateId(); const now = new Date()
  await db.insert(cycleCounts).values({
    id, orgId: cmd.orgId, warehouseId: cmd.warehouseId,
    countType: cmd.countType, scheduledAt: cmd.scheduledAt,
    status: 'SCHEDULED', createdAt: now, updatedAt: now,
  })
  return { id }
}
