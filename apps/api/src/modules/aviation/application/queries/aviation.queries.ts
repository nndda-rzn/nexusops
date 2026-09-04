import { aircraft, flights, airwayBills } from '@/shared/database/schema/aviation'
import { eq, and, sql } from 'drizzle-orm'
import { normalizePagination, toOffset, paginate } from '@/shared/pagination'
import { FlightNotFoundError, AircraftNotFoundError } from '@/modules/aviation/domain/errors/aviation.errors'
import type { DbContext } from '@/shared/database/client'

export async function listAircraftQuery(orgId: string, db: DbContext,
  params?: { page?: number; limit?: number; status?: string }
) {
  const { page, limit } = normalizePagination(params ?? {})
  const offset = toOffset(page, limit)
  const conditions = [eq(aircraft.orgId, orgId)]
  if (params?.status) conditions.push(
    eq(aircraft.status, params.status as 'ACTIVE' | 'MAINTENANCE' | 'AOG' | 'RETIRED')
  )
  const whereClause = and(...conditions)
  const [rows, [countResult]] = await Promise.all([
    db.select().from(aircraft).where(whereClause).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(aircraft).where(whereClause),
  ])
  return paginate(rows, page, limit, countResult?.count ?? 0)
}

export async function getAircraftQuery(id: string, orgId: string, db: DbContext) {
  const [row] = await db.select().from(aircraft)
    .where(and(eq(aircraft.id, id), eq(aircraft.orgId, orgId))).limit(1)
  if (!row) throw new AircraftNotFoundError(id)
  return row
}

export async function listFlightsQuery(orgId: string, db: DbContext,
  params?: { page?: number; limit?: number; status?: string }
) {
  const { page, limit } = normalizePagination(params ?? {})
  const offset = toOffset(page, limit)
  const conditions = [eq(flights.orgId, orgId)]
  if (params?.status) conditions.push(
    eq(flights.status, params.status as 'SCHEDULED' | 'SLOT_CONFIRMED' | 'CARGO_ACCEPTANCE' | 'MANIFEST_CLOSED' | 'LOAD_PLANNED' | 'LOADING' | 'READY_FOR_DEPARTURE' | 'DEPARTED' | 'ARRIVED' | 'OFFLOADING' | 'COMPLETED' | 'DELAYED' | 'DIVERTED' | 'CANCELLED' | 'AOG')
  )
  const whereClause = and(...conditions)
  const [rows, [countResult]] = await Promise.all([
    db.select().from(flights).where(whereClause).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(flights).where(whereClause),
  ])
  return paginate(rows, page, limit, countResult?.count ?? 0)
}

export async function getFlightQuery(id: string, orgId: string, db: DbContext) {
  const [row] = await db.select().from(flights)
    .where(and(eq(flights.id, id), eq(flights.orgId, orgId))).limit(1)
  if (!row) throw new FlightNotFoundError(id)
  return row
}

export async function listAwbsQuery(orgId: string, db: DbContext,
  params?: { page?: number; limit?: number; flightId?: string }
) {
  const { page, limit } = normalizePagination(params ?? {})
  const offset = toOffset(page, limit)
  const conditions = [eq(airwayBills.orgId, orgId)]
  if (params?.flightId) conditions.push(eq(airwayBills.flightId, params.flightId))
  const whereClause = and(...conditions)
  const [rows, [countResult]] = await Promise.all([
    db.select().from(airwayBills).where(whereClause).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(airwayBills).where(whereClause),
  ])
  return paginate(rows, page, limit, countResult?.count ?? 0)
}
