import { yards, blocks, slots, yardMovements } from '@/shared/database/schema/yard'
import { eq, and } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { SlotNotFoundError, SlotNotAvailableError } from '@/modules/yard/domain/errors/yard.errors'
import { eventBus } from '@/shared/events'
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
  const id = generateId()
  await db.insert(blocks).values({
    id, orgId: cmd.orgId, yardId: cmd.yardId, code: cmd.code,
    blockType: cmd.blockType, bayCount: cmd.bayCount, rowCount: cmd.rowCount,
    maxTier: cmd.maxTier ?? 5, equipmentType: cmd.equipmentType,
    createdAt: new Date(),
  })
  return { id }
}

// ─── Slot Container Operations ───
export interface PlaceContainerCommand {
  orgId: string; slotId: string; containerId: string
  movementType?: 'INBOUND' | 'OUTBOUND' | 'RESHUFFLE' | 'SHIFT' | undefined
  equipmentId?: string | undefined; operatorId?: string | undefined
}
export async function placeContainerCommand(cmd: PlaceContainerCommand, db: DbContext): Promise<void> {
  const [slot] = await db.select().from(slots)
    .where(and(eq(slots.id, cmd.slotId), eq(slots.orgId, cmd.orgId))).limit(1)
  if (!slot) throw new SlotNotFoundError(cmd.slotId)
  if (slot.status !== 'EMPTY' && slot.status !== 'RESERVED') {
    throw new SlotNotAvailableError(cmd.slotId, slot.status)
  }
  const now = new Date()
  await db.update(slots)
    .set({ status: 'OCCUPIED', containerId: cmd.containerId, reservedFor: null, updatedAt: now })
    .where(eq(slots.id, cmd.slotId))

  await db.insert(yardMovements).values({
    id: generateId(), orgId: cmd.orgId,
    containerId: cmd.containerId, fromSlotId: null,
    toSlotId: cmd.slotId,
    movementType: cmd.movementType ?? 'INBOUND',
    equipmentId: cmd.equipmentId, operatorId: cmd.operatorId,
    movedAt: now,
  })

  await eventBus.emit('yard.container_placed', {
    type: 'yard.container_placed',
    yardId: slot.blockId, orgId: cmd.orgId,
    containerId: cmd.containerId, slotId: cmd.slotId, occurredAt: now,
  })
}

export interface MoveContainerInYardCommand {
  orgId: string; fromSlotId: string; toSlotId: string; containerId: string
  equipmentId?: string | undefined; operatorId?: string | undefined
}
export async function moveContainerInYardCommand(cmd: MoveContainerInYardCommand, db: DbContext): Promise<void> {
  const now = new Date()
  await db.update(slots).set({ status: 'EMPTY', containerId: null, updatedAt: now })
    .where(eq(slots.id, cmd.fromSlotId))
  await db.update(slots).set({ status: 'OCCUPIED', containerId: cmd.containerId, updatedAt: now })
    .where(eq(slots.id, cmd.toSlotId))
  await db.insert(yardMovements).values({
    id: generateId(), orgId: cmd.orgId,
    containerId: cmd.containerId,
    fromSlotId: cmd.fromSlotId, toSlotId: cmd.toSlotId,
    movementType: 'RESHUFFLE',
    equipmentId: cmd.equipmentId, operatorId: cmd.operatorId,
    movedAt: now,
  })
  await eventBus.emit('yard.container_moved', {
    type: 'yard.container_moved',
    yardId: cmd.fromSlotId, orgId: cmd.orgId,
    containerId: cmd.containerId, fromSlotId: cmd.fromSlotId,
    toSlotId: cmd.toSlotId, occurredAt: now,
  })
}

export interface RemoveContainerFromYardCommand {
  orgId: string; slotId: string; containerId: string
  equipmentId?: string | undefined; operatorId?: string | undefined
}
export async function removeContainerFromYardCommand(cmd: RemoveContainerFromYardCommand, db: DbContext): Promise<void> {
  const now = new Date()
  await db.update(slots).set({ status: 'EMPTY', containerId: null, updatedAt: now })
    .where(eq(slots.id, cmd.slotId))
  await db.insert(yardMovements).values({
    id: generateId(), orgId: cmd.orgId,
    containerId: cmd.containerId,
    fromSlotId: cmd.slotId, toSlotId: cmd.slotId,
    movementType: 'OUTBOUND',
    equipmentId: cmd.equipmentId, operatorId: cmd.operatorId,
    movedAt: now,
  })
  await eventBus.emit('yard.container_removed', {
    type: 'yard.container_removed',
    yardId: cmd.slotId, orgId: cmd.orgId,
    containerId: cmd.containerId, slotId: cmd.slotId, occurredAt: now,
  })
}

export async function reserveSlotCommand(
  cmd: { orgId: string; slotId: string; reservedFor: string }, db: DbContext
): Promise<void> {
  await db.update(slots)
    .set({ status: 'RESERVED', reservedFor: cmd.reservedFor, updatedAt: new Date() })
    .where(and(eq(slots.id, cmd.slotId), eq(slots.orgId, cmd.orgId)))
  await eventBus.emit('yard.slot_reserved', {
    type: 'yard.slot_reserved',
    orgId: cmd.orgId, slotId: cmd.slotId,
    reservedFor: cmd.reservedFor, occurredAt: new Date(),
  })
}
