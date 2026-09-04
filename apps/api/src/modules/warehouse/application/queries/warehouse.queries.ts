import { warehouses, receivings, inventory, cycleCounts } from '@/shared/database/schema/warehouse'
import { eq, and, sql } from 'drizzle-orm'
import { normalizePagination, toOffset, paginate } from '@/shared/pagination'
import { WarehouseNotFoundError } from '@/modules/warehouse/domain/errors/warehouse.errors'
import type { DbContext } from '@/shared/database/client'

export async function listWarehousesQuery(orgId: string, db: DbContext) {
  return db.select().from(warehouses).where(eq(warehouses.orgId, orgId))
}

export async function getWarehouseQuery(id: string, orgId: string, db: DbContext) {
  const [row] = await db.select().from(warehouses)
    .where(and(eq(warehouses.id, id), eq(warehouses.orgId, orgId))).limit(1)
  if (!row) throw new WarehouseNotFoundError(id)
  return row
}

export async function listReceivingsQuery(orgId: string, warehouseId: string, db: DbContext,
  params?: { page?: number; limit?: number }
) {
  const { page, limit } = normalizePagination(params ?? {})
  const offset = toOffset(page, limit)
  const whereClause = and(eq(receivings.orgId, orgId), eq(receivings.warehouseId, warehouseId))
  const [rows, [countResult]] = await Promise.all([
    db.select().from(receivings).where(whereClause).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(receivings).where(whereClause),
  ])
  return paginate(rows, page, limit, countResult?.count ?? 0)
}

export async function listInventoryQuery(orgId: string, warehouseId: string, db: DbContext,
  params?: { page?: number; limit?: number; sku?: string }
) {
  const { page, limit } = normalizePagination(params ?? {})
  const offset = toOffset(page, limit)
  const conditions = [eq(inventory.orgId, orgId), eq(inventory.warehouseId, warehouseId)]
  if (params?.sku) conditions.push(eq(inventory.sku, params.sku))
  const whereClause = and(...conditions)
  const [rows, [countResult]] = await Promise.all([
    db.select().from(inventory).where(whereClause).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(inventory).where(whereClause),
  ])
  return paginate(rows, page, limit, countResult?.count ?? 0)
}

export async function listCycleCountsQuery(orgId: string, warehouseId: string, db: DbContext) {
  return db.select().from(cycleCounts)
    .where(and(eq(cycleCounts.orgId, orgId), eq(cycleCounts.warehouseId, warehouseId)))
    .orderBy(cycleCounts.scheduledAt)
}
