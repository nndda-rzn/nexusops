import { manifestItems, loadPlans, loadPlanItems, groundHandlings, cargoManifests, airportSlots } from '@/shared/database/schema/aviation'
import { eq, and } from 'drizzle-orm'
import type { DbContext } from '@/shared/database/client'

export async function getManifestByFlightQuery(orgId: string, flightId: string, db: DbContext) {
  const [row] = await db.select().from(cargoManifests)
    .where(and(eq(cargoManifests.flightId, flightId), eq(cargoManifests.orgId, orgId)))
    .limit(1)
  return row ?? null
}

export async function listManifestItemsQuery(manifestId: string, db: DbContext) {
  return db.select().from(manifestItems).where(eq(manifestItems.manifestId, manifestId))
}

export async function listLoadPlanItemsQuery(loadPlanId: string, db: DbContext) {
  return db.select().from(loadPlanItems).where(eq(loadPlanItems.loadPlanId, loadPlanId))
}

export async function listGroundHandlingsQuery(orgId: string, flightId: string, db: DbContext) {
  return db.select().from(groundHandlings)
    .where(and(eq(groundHandlings.flightId, flightId), eq(groundHandlings.orgId, orgId)))
}

export async function listSlotsQuery(orgId: string, db: DbContext) {
  return db.select().from(airportSlots).where(eq(airportSlots.orgId, orgId))
}

export async function listLoadPlansQuery(orgId: string, flightId: string, db: DbContext) {
  return db.select().from(loadPlans)
    .where(and(eq(loadPlans.flightId, flightId), eq(loadPlans.orgId, orgId)))
}
