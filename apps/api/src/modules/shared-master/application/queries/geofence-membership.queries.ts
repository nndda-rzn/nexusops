import { geofenceMemberships } from '@/shared/database/schema/shared-master'
import { eq, and, inArray } from 'drizzle-orm'
import type { DbContext } from '@/shared/database/client'

export interface GeofenceDelta {
  entered: { vehicleId: string; position: string }[]
  exited: { vehicleId: string }[]
  stillInside: { vehicleId: string }[]
}

// Sync membership state against the current inside-set for one geofence.
// Returns delta so the caller can emit geofence.entered/exited once per
// transition (not on every poll).
export async function syncGeofenceMembership(
  geofenceId: string,
  orgId: string,
  insideRows: { vehicleId: string; position: string }[],
  db: DbContext
): Promise<GeofenceDelta> {
  const insideIds = insideRows.map(r => r.vehicleId)

  const existing = await db.select({
    vehicleId: geofenceMemberships.vehicleId,
  }).from(geofenceMemberships)
    .where(and(
      eq(geofenceMemberships.geofenceId, geofenceId),
      eq(geofenceMemberships.orgId, orgId),
    ))

  const existingIds = new Set(existing.map(e => e.vehicleId))
  const insideSet = new Set(insideIds)

  const entered = insideRows.filter(r => !existingIds.has(r.vehicleId))
  const exited = [...existingIds].filter(id => !insideSet.has(id))
  const stillInside = insideRows.filter(r => existingIds.has(r.vehicleId))

  if (entered.length > 0) {
    await db.insert(geofenceMemberships).values(
      entered.map(r => ({
        geofenceId,
        vehicleId: r.vehicleId,
        orgId,
        enteredAt: new Date(),
        lastSeenAt: new Date(),
      }))
    ).onConflictDoNothing()
  }

  if (stillInside.length > 0) {
    await db.update(geofenceMemberships).set({ lastSeenAt: new Date() })
      .where(and(
        eq(geofenceMemberships.geofenceId, geofenceId),
        eq(geofenceMemberships.orgId, orgId),
        inArray(geofenceMemberships.vehicleId, stillInside.map(r => r.vehicleId)),
      ))
  }

  if (exited.length > 0) {
    await db.delete(geofenceMemberships)
      .where(and(
        eq(geofenceMemberships.geofenceId, geofenceId),
        eq(geofenceMemberships.orgId, orgId),
        inArray(geofenceMemberships.vehicleId, exited),
      ))
  }

  return { entered, exited: exited.map(id => ({ vehicleId: id })), stillInside }
}