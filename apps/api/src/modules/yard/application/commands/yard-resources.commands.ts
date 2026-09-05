import { yards, blocks, slots } from '@/shared/database/schema/yard'
import { eq, and } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { YardNotFoundError } from '@/modules/yard/domain/errors/yard.errors'
import { DomainError } from '@/shared/errors'
import type { DbContext } from '@/shared/database/client'

// ─── Yard ───
export interface CreateYardCommand {
  orgId: string; terminalId: string; code: string; name: string
  type: 'IMPORT' | 'EXPORT' | 'TRANSSHIP' | 'REEFER' | 'HAZMAT' | 'EMPTY'
  totalCapacityTeu?: number | undefined; boundary?: string | undefined
}
export async function createYardCommand(cmd: CreateYardCommand, db: DbContext): Promise<{ id: string }> {
  const id = generateId(); const now = new Date()
  await db.insert(yards).values({
    id, orgId: cmd.orgId, terminalId: cmd.terminalId,
    code: cmd.code, name: cmd.name, type: cmd.type,
    totalCapacityTeu: cmd.totalCapacityTeu,
    boundary: cmd.boundary,
    createdAt: now, updatedAt: now,
  })
  return { id }
}

// ─── Block ───
export interface CreateBlockCommand {
  orgId: string; yardId: string; code: string
  blockType: 'IMPORT' | 'EXPORT' | 'REEFER' | 'EMPTY' | 'HAZMAT'
  bayCount: number; rowCount: number; maxTier?: number | undefined
  equipmentType?: 'RTG' | 'RMG' | 'STRADDLE' | undefined
}
export async function createBlockCommand(cmd: CreateBlockCommand, db: DbContext): Promise<{ id: string }> {
  // P3R-02 FIX: validate yard exists before creating block
  const [yard] = await db.select().from(yards)
    .where(and(eq(yards.id, cmd.yardId), eq(yards.orgId, cmd.orgId))).limit(1)
  if (!yard) throw new YardNotFoundError(cmd.yardId)

  const blockId = generateId()
  await db.transaction(async (tx) => {
    await tx.insert(blocks).values({
      id: blockId, orgId: cmd.orgId, yardId: cmd.yardId, code: cmd.code,
      blockType: cmd.blockType, bayCount: cmd.bayCount, rowCount: cmd.rowCount,
      maxTier: cmd.maxTier ?? 5, equipmentType: cmd.equipmentType,
      createdAt: new Date(),
    })

    // P3R-02 FIX: auto-generate all slots from block dimensions
    const maxTier = cmd.maxTier ?? 5
    const totalSlots = cmd.bayCount * cmd.rowCount * maxTier
    if (totalSlots > 5000) {
      throw new DomainError('too-many-slots', 'Too Many Slots',
        `Block would create ${totalSlots} slots. Maximum supported is 5000.`,
        { block_id: blockId, total_slots: totalSlots })
    }

    const slotValues: Array<{
      id: string; orgId: string; blockId: string
      bay: string; row: string; tier: number
      status: 'EMPTY'; updatedAt: Date
    }> = []
    for (let bay = 1; bay <= cmd.bayCount; bay++) {
      for (let row = 0; row < cmd.rowCount; row++) {
        for (let tier = 1; tier <= maxTier; tier++) {
          slotValues.push({
            id: generateId(),
            orgId: cmd.orgId,
            blockId,
            bay: bay.toString().padStart(2, '0'),
            row: String.fromCharCode(65 + row),
            tier,
            status: 'EMPTY',
            updatedAt: new Date(),
          })
        }
      }
    }
    await tx.insert(slots).values(slotValues)
  })
  return { id: blockId }
}
