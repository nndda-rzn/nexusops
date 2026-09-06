import { sql } from 'drizzle-orm'
import type { DbContext } from '@/shared/database/client'

// Raw PostGIS queries (Drizzle has no native ST_ helpers).
// Defense-in-depth: RLS via withDbContext AND explicit org_id filter in SQL —
// all other repo queries filter org explicitly; vehicle_positions has no
// org_id column so we scope via join to road.vehicles.

export interface VehicleInsideGeofenceRow {
  vehicle_id: string
  inside: boolean
  position: string
  recorded_at: string
}

export interface NearbyVehicleRow {
  vehicle_id: string
  plate_number: string | null
  distance_km: number
  recorded_at: string
}

// Latest position per vehicle (org-scoped) + containment against one geofence boundary
export async function evaluateGeofenceQuery(
  geofenceId: string,
  orgId: string,
  db: DbContext
): Promise<VehicleInsideGeofenceRow[]> {
  const rows = await db.execute(sql`
    WITH latest AS (
      SELECT DISTINCT ON (vp.vehicle_id) vp.vehicle_id, vp.position, vp.recorded_at
      FROM road.vehicle_positions vp
      JOIN road.vehicles v ON v.id = vp.vehicle_id
      WHERE v.org_id = ${orgId}
      ORDER BY vp.vehicle_id, vp.recorded_at DESC
    )
    SELECT
      l.vehicle_id,
      ST_Contains(g.boundary, l.position) AS inside,
      ST_AsText(l.position) AS position,
      l.recorded_at
    FROM shared_master.geofences g
    CROSS JOIN latest l
    WHERE g.id = ${geofenceId}
  `)
  return rows as unknown as VehicleInsideGeofenceRow[]
}

// Latest position per vehicle (org-scoped) within radius of a point (km), nearest first
export async function getNearbyVehiclesQuery(
  orgId: string,
  longitude: number,
  latitude: number,
  radiusKm: number,
  db: DbContext
): Promise<NearbyVehicleRow[]> {
  const rows = await db.execute(sql`
    WITH latest AS (
      SELECT DISTINCT ON (vp.vehicle_id) vp.vehicle_id, vp.position, vp.recorded_at
      FROM road.vehicle_positions vp
      JOIN road.vehicles v ON v.id = vp.vehicle_id
      WHERE v.org_id = ${orgId}
      ORDER BY vp.vehicle_id, vp.recorded_at DESC
    )
    SELECT
      l.vehicle_id,
      v.plate_number,
      ROUND((ST_Distance(
        l.position::geography,
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
      ) / 1000)::numeric, 2) AS distance_km,
      l.recorded_at
    FROM latest l
    JOIN road.vehicles v ON v.id = l.vehicle_id
    WHERE ST_DWithin(
      l.position::geography,
      ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
      ${radiusKm * 1000}
    )
    ORDER BY distance_km, l.vehicle_id
  `)
  return rows as unknown as NearbyVehicleRow[]
}