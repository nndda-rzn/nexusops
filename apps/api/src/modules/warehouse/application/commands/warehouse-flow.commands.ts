import { receivings, inventory, pickings } from '@/shared/database/schema/warehouse'
import { eq, and } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { eventBus } from '@/shared/events'
import { DomainError, DomainNotFoundError } from '@/shared/errors'
import type { DbContext } from '@/shared/database/client'

export interface PutawayItem {
  sku: string
  quantity: string
  description?: string | undefined
  locationId?: string | undefined
  batchNumber?: string | undefined
  expiryDate?: string | undefined
}

export interface CompletePutawayCommand {
  orgId: string
  warehouseId: string
  receivingId: string
  items: PutawayItem[]
}

// P3R-03 FIX: complete receiving + upsert all items into inventory
export async function completePutawayCommand(cmd: CompletePutawayCommand, db: DbContext): Promise<void> {
  await db.transaction(async (tx) => {
    const [receiving] = await tx.select().from(receivings)
      .where(and(
        eq(receivings.id, cmd.receivingId),
        eq(receivings.warehouseId, cmd.warehouseId),
        eq(receivings.orgId, cmd.orgId),
      ))
      .limit(1)
    if (!receiving) throw new DomainNotFoundError('receiving-not-found', 'Receiving Not Found',
      `Receiving '${cmd.receivingId}' does not exist.`, { receiving_id: cmd.receivingId })
    if (receiving.status === 'COMPLETED') {
      throw new DomainError('receiving-already-completed', 'Receiving Already Completed',
        `Receiving '${cmd.receivingId}' is already completed.`, { receiving_id: cmd.receivingId })
    }

    const now = new Date()
    await tx.update(receivings).set({ status: 'COMPLETED', updatedAt: now })
      .where(eq(receivings.id, cmd.receivingId))

    for (const item of cmd.items) {
      const [existing] = await tx.select({ id: inventory.id }).from(inventory)
        .where(and(
          eq(inventory.warehouseId, cmd.warehouseId),
          eq(inventory.sku, item.sku),
        ))
        .limit(1)

      if (existing) {
        await tx.update(inventory)
          .set({
            quantityOnHand: item.quantity,
            description: item.description ?? undefined,
            locationId: item.locationId ?? undefined,
            batchNumber: item.batchNumber ?? undefined,
            expiryDate: item.expiryDate ?? undefined,
            updatedAt: now,
          })
          .where(eq(inventory.id, existing.id))
      } else {
        await tx.insert(inventory).values({
          id: generateId(), orgId: cmd.orgId,
          warehouseId: cmd.warehouseId, sku: item.sku,
          description: item.description,
          quantityOnHand: item.quantity, quantityReserved: '0',
          locationId: item.locationId, batchNumber: item.batchNumber,
          expiryDate: item.expiryDate, updatedAt: now,
        })
      }
    }
  })

  await eventBus.emit('warehouse.putaway_completed', {
    type: 'warehouse.putaway_completed',
    warehouseId: cmd.warehouseId, orgId: cmd.orgId,
    receivingId: cmd.receivingId, occurredAt: new Date(),
  })
}

export interface PickingItem {
  sku: string
  quantity: string
}

export interface CompletePickingCommand {
  orgId: string
  warehouseId: string
  pickingId: string
  items: PickingItem[]
}

// P3R-03 FIX: complete picking + decrement inventory for each picked SKU
export async function completePickingCommand(cmd: CompletePickingCommand, db: DbContext): Promise<void> {
  await db.transaction(async (tx) => {
    const [picking] = await tx.select().from(pickings)
      .where(and(
        eq(pickings.id, cmd.pickingId),
        eq(pickings.warehouseId, cmd.warehouseId),
        eq(pickings.orgId, cmd.orgId),
      ))
      .limit(1)
    if (!picking) throw new DomainNotFoundError('picking-not-found', 'Picking Not Found',
      `Picking '${cmd.pickingId}' does not exist.`, { picking_id: cmd.pickingId })
    if (picking.status === 'COMPLETED') {
      throw new DomainError('picking-already-completed', 'Picking Already Completed',
        `Picking '${cmd.pickingId}' is already completed.`, { picking_id: cmd.pickingId })
    }

    const now = new Date()
    await tx.update(pickings)
      .set({ status: 'COMPLETED', completedAt: now, updatedAt: now })
      .where(eq(pickings.id, cmd.pickingId))

    for (const item of cmd.items) {
      const [row] = await tx.select({ id: inventory.id, quantityOnHand: inventory.quantityOnHand })
        .from(inventory)
        .where(and(
          eq(inventory.warehouseId, cmd.warehouseId),
          eq(inventory.sku, item.sku),
        ))
        .limit(1)
      if (!row) {
        throw new DomainError('inventory-not-found', 'Inventory Not Found',
          `No inventory row for SKU '${item.sku}' in this warehouse.`,
          { warehouse_id: cmd.warehouseId, sku: item.sku })
      }
      const onHand = Number(row.quantityOnHand)
      const picked = Number(item.quantity)
      const remaining = onHand - picked
      if (remaining < 0) {
        throw new DomainError('insufficient-stock', 'Insufficient Stock',
          `Cannot pick ${picked} of SKU '${item.sku}' — only ${onHand} on hand.`,
          { sku: item.sku, on_hand: onHand, requested: picked })
      }
      await tx.update(inventory)
        .set({ quantityOnHand: remaining.toString(), updatedAt: now })
        .where(eq(inventory.id, row.id))
    }
  })

  await eventBus.emit('warehouse.picking_completed', {
    type: 'warehouse.picking_completed',
    warehouseId: cmd.warehouseId, orgId: cmd.orgId,
    pickingId: cmd.pickingId, occurredAt: new Date(),
  })
}
