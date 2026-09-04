import { handoverRequests } from '@/shared/database/schema/intermodal'
import { eq, and, or } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { HandoverNotFoundError } from '@/modules/intermodal/domain/errors/handover.errors'
import type { DbContext } from '@/shared/database/client'

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

export type HandoverRow = typeof handoverRequests.$inferSelect
export type HandoverInsert = typeof handoverRequests.$inferInsert

// ─────────────────────────────────────────
// Read
// ─────────────────────────────────────────

export async function findHandoverById(
  id: string,
  entityId: string,
  db: DbContext
): Promise<HandoverRow | null> {
  const [row] = await db.select().from(handoverRequests)
    .where(and(
      eq(handoverRequests.id, id),
      or(
        eq(handoverRequests.fromEntityId, entityId),
        eq(handoverRequests.toEntityId, entityId),
      ),
    ))
    .limit(1)
  return row ?? null
}

export async function findHandoverByIdOrFail(
  id: string,
  entityId: string,
  db: DbContext
): Promise<HandoverRow> {
  const row = await findHandoverById(id, entityId, db)
  if (!row) throw new HandoverNotFoundError(id)
  return row
}

export async function findHandoverByIdForRespond(
  id: string,
  toEntityId: string,
  db: DbContext
): Promise<HandoverRow | null> {
  const [row] = await db.select().from(handoverRequests)
    .where(and(
      eq(handoverRequests.id, id),
      eq(handoverRequests.toEntityId, toEntityId),
    ))
    .limit(1)
  return row ?? null
}

// ─────────────────────────────────────────
// Write
// ─────────────────────────────────────────

export async function insertHandover(
  params: Omit<HandoverInsert, 'id'> & { id?: string },
  db: DbContext
): Promise<string> {
  const id = params.id ?? generateId()
  await db.insert(handoverRequests).values({ ...params, id })
  return id
}

export async function updateHandoverStatus(
  id: string,
  patch: Partial<Pick<HandoverRow, 'status' | 'acceptedAt' | 'rejectedAt' | 'completedAt' | 'rejectionReason'>>,
  db: DbContext
): Promise<void> {
  await db.update(handoverRequests)
    .set(patch)
    .where(eq(handoverRequests.id, id))
}
