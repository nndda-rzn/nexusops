import { routes } from '@/shared/database/schema/road'
import { generateId } from '@/shared/ids'
import type { DbContext } from '@/shared/database/client'

export type RouteType = 'HIGHWAY' | 'PROVINCIAL' | 'LOCAL' | 'TOLL'

export interface CreateRouteCommand {
  orgId: string
  origin?: string | undefined  // WKT POINT
  destination?: string | undefined  // WKT POINT
  geometry?: string | undefined  // WKT LINESTRING
  distanceKm: string
  estimatedDurationMinutes: number
  tollCost?: string | undefined
  routeType: RouteType
}

export async function createRouteCommand(
  cmd: CreateRouteCommand,
  db: DbContext
): Promise<{ id: string }> {
  const id = generateId()
  const now = new Date()
  await db.insert(routes).values({
    id,
    orgId: cmd.orgId,
    ...(cmd.origin ? { origin: cmd.origin } : {}),
    ...(cmd.destination ? { destination: cmd.destination } : {}),
    ...(cmd.geometry ? { geometry: cmd.geometry } : {}),
    distanceKm: cmd.distanceKm,
    estimatedDurationMinutes: cmd.estimatedDurationMinutes,
    ...(cmd.tollCost ? { tollCost: cmd.tollCost } : {}),
    routeType: cmd.routeType,
    createdAt: now,
  })
  return { id }
}