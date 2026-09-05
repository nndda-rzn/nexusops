import { slots, yardMovements } from '@/shared/database/schema/yard'
import { eq, and } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { SlotNotFoundError, SlotNotAvailableError } from '@/modules/yard/domain/errors/yard.errors'
import { DomainError } from '@/shared/errors'
import { eventBus } from '@/shared/events'
import { findYardIdForSlot, assertContainerNotInYard } from '@/modules/yard/application/commands/yard-slot-guards'
import type { DbContext } from '@/shared/database/client'

export interface PlaceContainerCommand {
  orgId: string; slotId: string; containerId: string
  movementType?: 'INBOUND' | 'OUTBOUND' | 'RESHUFFLE' | 'SHIFT' | undefined
  equipmentId?: string | undefined; operatorId?: string | undefined
}
export async function placeContainerCommand(cmd: PlaceContainerCommand, db: DbContext): Promise<void> {
  await db.transaction(async (tx) => {
    const [slot] = await tx.select().from(slots)
      .where(and(eq(slots.id, cmd.slotId), eq(slots.orgId, cmd.orgId))).limit(1)
    if (!slot) throw new SlotNotFoundError(cmd.slotId)
    if (slot.status !== 'EMPTY' && slot.status !== 'RESERVED') {
      throw new SlotNotAvailableError(cmd.slotId, slot.status)
    }
    await assertContainerNotInYard(cmd.containerId, cmd.orgId, undefined, tx)

    const now = new Date()
    await tx.update(slots)
      .set({ status: 'OCCUPIED', containerId: cmd.containerId, reservedFor: null, updatedAt: now })
      .where(eq(slots.id, cmd.slotId))
    await tx.insert(yardMovements).values({
      id: generateId(), orgId: cmd.orgId,
      containerId: cmd.containerId, fromSlotId: null,
      toSlotId: cmd.slotId,
      movementType: cmd.movementType ?? 'INBOUND',
      equipmentId: cmd.equipmentId, operatorId: cmd.operatorId,
      movedAt: now,
    })

    const yardId = await findYardIdForSlot(cmd.slotId, tx)
    await eventBus.emit('yard.container_placed', {
      type: 'yard.container_placed',
      yardId, orgId: cmd.orgId, containerId: cmd.containerId,
      slotId: cmd.slotId, occurredAt: now,
    })
  })
}

export interface MoveContainerInYardCommand {
  orgId: string; fromSlotId: string; toSlotId: string; containerId: string
  equipmentId?: string | undefined; operatorId?: string | undefined
}
export async function moveContainerInYardCommand(cmd: MoveContainerInYardCommand, db: DbContext): Promise<void> {
  await db.transaction(async (tx) => {
    const [fromSlot] = await tx.select().from(slots)
      .where(and(eq(slots.id, cmd.fromSlotId), eq(slots.orgId, cmd.orgId))).limit(1)
    if (!fromSlot) throw new SlotNotFoundError(cmd.fromSlotId)
    if (fromSlot.status !== 'OCCUPIED' || fromSlot.containerId !== cmd.containerId) {
      throw new DomainError('container-not-in-slot', 'Container Not In Slot',
        `Container '${cmd.containerId}' is not in slot '${cmd.fromSlotId}'.`,
        { container_id: cmd.containerId, from_slot_id: cmd.fromSlotId, slot_status: fromSlot.status })
    }
    const [toSlot] = await tx.select().from(slots)
      .where(and(eq(slots.id, cmd.toSlotId), eq(slots.orgId, cmd.orgId))).limit(1)
    if (!toSlot) throw new SlotNotFoundError(cmd.toSlotId)
    if (toSlot.status !== 'EMPTY' && toSlot.status !== 'RESERVED') {
      throw new SlotNotAvailableError(cmd.toSlotId, toSlot.status)
    }

    const now = new Date()
    await tx.update(slots).set({ status: 'EMPTY', containerId: null, updatedAt: now })
      .where(eq(slots.id, cmd.fromSlotId))
    await tx.update(slots)
      .set({ status: 'OCCUPIED', containerId: cmd.containerId, reservedFor: null, updatedAt: now })
      .where(eq(slots.id, cmd.toSlotId))
    await tx.insert(yardMovements).values({
      id: generateId(), orgId: cmd.orgId,
      containerId: cmd.containerId,
      fromSlotId: cmd.fromSlotId, toSlotId: cmd.toSlotId,
      movementType: 'RESHUFFLE',
      equipmentId: cmd.equipmentId, operatorId: cmd.operatorId,
      movedAt: now,
    })

    const yardId = await findYardIdForSlot(cmd.fromSlotId, tx)
    await eventBus.emit('yard.container_moved', {
      type: 'yard.container_moved',
      yardId, orgId: cmd.orgId,
      containerId: cmd.containerId, fromSlotId: cmd.fromSlotId,
      toSlotId: cmd.toSlotId, occurredAt: now,
    })
  })
}

export interface RemoveContainerFromYardCommand {
  orgId: string; slotId: string; containerId: string
  equipmentId?: string | undefined; operatorId?: string | undefined
}
export async function removeContainerFromYardCommand(cmd: RemoveContainerFromYardCommand, db: DbContext): Promise<void> {
  await db.transaction(async (tx) => {
    const [slot] = await tx.select().from(slots)
      .where(and(eq(slots.id, cmd.slotId), eq(slots.orgId, cmd.orgId))).limit(1)
    if (!slot) throw new SlotNotFoundError(cmd.slotId)
    if (slot.status !== 'OCCUPIED' || slot.containerId !== cmd.containerId) {
      throw new DomainError('container-not-in-slot', 'Container Not In Slot',
        `Container '${cmd.containerId}' is not in slot '${cmd.slotId}'.`,
        { container_id: cmd.containerId, slot_id: cmd.slotId, slot_status: slot.status })
    }

    const now = new Date()
    await tx.update(slots).set({ status: 'EMPTY', containerId: null, updatedAt: now })
      .where(eq(slots.id, cmd.slotId))
    // OUTBOUND movement has no destination slot (to_slot_id is nullable)
    await tx.insert(yardMovements).values({
      id: generateId(), orgId: cmd.orgId,
      containerId: cmd.containerId,
      fromSlotId: cmd.slotId, toSlotId: null,
      movementType: 'OUTBOUND',
      equipmentId: cmd.equipmentId, operatorId: cmd.operatorId,
      movedAt: now,
    })

    const yardId = await findYardIdForSlot(cmd.slotId, tx)
    await eventBus.emit('yard.container_removed', {
      type: 'yard.container_removed',
      yardId, orgId: cmd.orgId, containerId: cmd.containerId,
      slotId: cmd.slotId, occurredAt: now,
    })
  })
}

export async function reserveSlotCommand(
  cmd: { orgId: string; slotId: string; reservedFor: string }, db: DbContext
): Promise<void> {
  const [slot] = await db.select().from(slots)
    .where(and(eq(slots.id, cmd.slotId), eq(slots.orgId, cmd.orgId))).limit(1)
  if (!slot) throw new SlotNotFoundError(cmd.slotId)
  if (slot.status === 'OCCUPIED') throw new SlotNotAvailableError(cmd.slotId, slot.status)

  await db.update(slots)
    .set({ status: 'RESERVED', reservedFor: cmd.reservedFor, updatedAt: new Date() })
    .where(and(eq(slots.id, cmd.slotId), eq(slots.orgId, cmd.orgId)))
  await eventBus.emit('yard.slot_reserved', {
    type: 'yard.slot_reserved',
    orgId: cmd.orgId, slotId: cmd.slotId,
    reservedFor: cmd.reservedFor, occurredAt: new Date(),
  })
}
