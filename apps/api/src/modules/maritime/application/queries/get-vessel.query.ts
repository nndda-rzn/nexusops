import { vessels } from '@/shared/database/schema/maritime'
import { eq, and } from 'drizzle-orm'
import { VesselNotFoundError } from '@/modules/maritime/domain/errors/vessel-not-found.error'
import type { DbContext } from '@/shared/database/client'

export async function getVesselQuery(id: string, orgId: string, db: DbContext) {
  const [row] = await db.select().from(vessels)
    .where(and(eq(vessels.id, id), eq(vessels.orgId, orgId)))
    .limit(1)
  if (!row) throw new VesselNotFoundError(id)
  return row
}
