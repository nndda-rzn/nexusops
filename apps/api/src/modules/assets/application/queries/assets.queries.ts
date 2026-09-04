import { assets, categories, inspections } from '@/shared/database/schema/assets'
import { eq, and, sql } from 'drizzle-orm'
import { normalizePagination, toOffset, paginate } from '@/shared/pagination'
import { AssetNotFoundError } from '@/modules/assets/domain/errors/assets.errors'
import type { DbContext } from '@/shared/database/client'

export async function listAssetsQuery(
  orgId: string, db: DbContext,
  params?: { page?: number; limit?: number; status?: string; categoryId?: string }
) {
  const { page, limit } = normalizePagination(params ?? {})
  const offset = toOffset(page, limit)
  const conditions = [eq(assets.orgId, orgId)]
  if (params?.status) conditions.push(
    eq(assets.status, params.status as 'ACTIVE' | 'IDLE' | 'ASSIGNED_OUT' | 'MAINTENANCE' | 'BREAKDOWN' | 'INSPECTION' | 'DECOMMISSIONED' | 'DISPOSED')
  )
  if (params?.categoryId) conditions.push(eq(assets.categoryId, params.categoryId))
  const whereClause = and(...conditions)
  const [rows, [countResult]] = await Promise.all([
    db.select().from(assets).where(whereClause).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(assets).where(whereClause),
  ])
  return paginate(rows, page, limit, countResult?.count ?? 0)
}

export async function getAssetQuery(id: string, orgId: string, db: DbContext) {
  const [row] = await db.select().from(assets)
    .where(and(eq(assets.id, id), eq(assets.orgId, orgId))).limit(1)
  if (!row) throw new AssetNotFoundError(id)
  return row
}

export async function listCategoriesQuery(orgId: string, db: DbContext) {
  return db.select().from(categories).where(eq(categories.orgId, orgId))
}

export async function listAssetInspectionsQuery(assetId: string, orgId: string, db: DbContext) {
  return db.select().from(inspections)
    .where(and(eq(inspections.assetId, assetId), eq(inspections.orgId, orgId)))
    .orderBy(inspections.inspectedAt)
}
