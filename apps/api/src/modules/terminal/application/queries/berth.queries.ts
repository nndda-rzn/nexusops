import { berths, berthAssignments } from '@/shared/database/schema/terminal'
import { eq, and } from 'drizzle-orm'
import { BerthNotFoundError } from '@/modules/terminal/domain/errors/berth.errors'
import type { DbContext } from '@/shared/database/client'

export async function listBerthsQuery(orgId: string, terminalId: string | undefined, db: DbContext) {
  const conditions = [eq(berths.orgId, orgId)]
  if (terminalId) conditions.push(eq(berths.terminalId, terminalId))

  return db.select({
    id: berths.id, code: berths.code, name: berths.name,
    terminalId: berths.terminalId, lengthM: berths.lengthM,
    maxDraftM: berths.maxDraftM, maxVesselLoa: berths.maxVesselLoa,
    status: berths.status,
  }).from(berths).where(and(...conditions))
}

export async function getBerthAssignmentsQuery(orgId: string, berthId: string, db: DbContext) {
  const [berth] = await db.select().from(berths)
    .where(and(eq(berths.id, berthId), eq(berths.orgId, orgId))).limit(1)
  if (!berth) throw new BerthNotFoundError(berthId)

  return db.select().from(berthAssignments)
    .where(and(
      eq(berthAssignments.berthId, berthId),
      eq(berthAssignments.orgId, orgId),
    ))
    .orderBy(berthAssignments.plannedStart)
}
