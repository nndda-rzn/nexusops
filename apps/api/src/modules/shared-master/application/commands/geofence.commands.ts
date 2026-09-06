import { geofences } from '@/shared/database/schema/shared-master'
import { eq } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { assertValidWkt } from '@/shared/database/types/geometry'
import { GeofenceNotFoundError, GeofenceConflictError } from '@/modules/shared-master/domain/errors/geofence.errors'
import type { DbContext } from '@/shared/database/client'

export type GeofenceType = 'TERMINAL' | 'PORT' | 'STATION' | 'WAREHOUSE' | 'AIRPORT' | 'CUSTOM'
export type GeofenceStatus = 'ACTIVE' | 'INACTIVE'

export interface CreateGeofenceCommand {
  name: string
  geofenceType: GeofenceType
  boundary: string  // WKT Polygon e.g. "POLYGON((lon lat, ...))"
  referenceId?: string | undefined
}

export interface UpdateGeofenceCommand {
  id: string
  name?: string | undefined
  boundary?: string | undefined
  referenceId?: string | undefined
}

export async function createGeofenceCommand(
  cmd: CreateGeofenceCommand,
  db: DbContext
): Promise<{ id: string; name: string }> {
  assertValidWkt('POLYGON', cmd.boundary)
  const id = generateId()
  const now = new Date()
  await db.insert(geofences).values({
    id,
    name: cmd.name,
    geofenceType: cmd.geofenceType,
    boundary: cmd.boundary,
    ...(cmd.referenceId ? { referenceId: cmd.referenceId } : {}),
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  })
  return { id, name: cmd.name }
}

export async function updateGeofenceCommand(
  cmd: UpdateGeofenceCommand,
  db: DbContext
): Promise<{ id: string }> {
  if (cmd.boundary !== undefined) assertValidWkt('POLYGON', cmd.boundary)
  const [existing] = await db.select().from(geofences).where(eq(geofences.id, cmd.id)).limit(1)
  if (!existing) throw new GeofenceNotFoundError(cmd.id)

  await db.update(geofences).set({
    ...(cmd.name !== undefined ? { name: cmd.name } : {}),
    ...(cmd.boundary !== undefined ? { boundary: cmd.boundary } : {}),
    ...(cmd.referenceId !== undefined ? { referenceId: cmd.referenceId } : {}),
    updatedAt: new Date(),
  }).where(eq(geofences.id, cmd.id))

  return { id: cmd.id }
}

export async function setGeofenceStatusCommand(
  id: string,
  status: GeofenceStatus,
  db: DbContext
): Promise<{ id: string }> {
  const [existing] = await db.select().from(geofences).where(eq(geofences.id, id)).limit(1)
  if (!existing) throw new GeofenceNotFoundError(id)

  await db.update(geofences).set({ status, updatedAt: new Date() })
    .where(eq(geofences.id, id))

  return { id }
}

// Guard: duplicate name check used by routes before insert (shared master has no org scope)
export async function assertGeofenceNameAvailable(
  name: string,
  db: DbContext,
  excludeId?: string | undefined
): Promise<void> {
  const [existing] = await db.select({ id: geofences.id }).from(geofences)
    .where(eq(geofences.name, name)).limit(1)
  if (existing && existing.id !== excludeId) {
    throw new GeofenceConflictError(`Geofence with name '${name}' already exists.`, { name })
  }
}