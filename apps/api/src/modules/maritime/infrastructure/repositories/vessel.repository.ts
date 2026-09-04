import { vessels } from '@/shared/database/schema/maritime'
import { eq, and } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { VesselNotFoundError } from '@/modules/maritime/domain/errors/vessel-not-found.error'
import { Vessel } from '@/modules/maritime/domain/entities/vessel.entity'
import type { VesselProps } from '@/modules/maritime/domain/entities/vessel.entity'
import type { DbContext } from '@/shared/database/client'

type VesselRow = typeof vessels.$inferSelect

function rowToVessel(row: VesselRow): Vessel {
  return Vessel.fromSnapshot({
    id: row.id,
    orgId: row.orgId,
    imoNumber: row.imoNumber,
    mmsi: row.mmsi ?? undefined,
    name: row.name,
    type: row.type,
    flag: row.flag ?? undefined,
    grossTonnage: row.grossTonnage ?? undefined,
    loa: row.loa ?? undefined,
    beam: row.beam ?? undefined,
    maxDraft: row.maxDraft ?? undefined,
    teuCapacity: row.teuCapacity ?? undefined,
    owner: row.owner ?? undefined,
    operator: row.operator ?? undefined,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  })
}

export async function findVesselById(id: string, orgId: string, db: DbContext): Promise<Vessel | null> {
  const [row] = await db.select().from(vessels)
    .where(and(eq(vessels.id, id), eq(vessels.orgId, orgId)))
    .limit(1)
  return row ? rowToVessel(row) : null
}

export async function findVesselByIdOrFail(id: string, orgId: string, db: DbContext): Promise<Vessel> {
  const vessel = await findVesselById(id, orgId, db)
  if (!vessel) throw new VesselNotFoundError(id)
  return vessel
}

export async function insertVessel(props: VesselProps, db: DbContext): Promise<void> {
  await db.insert(vessels).values({
    id: props.id ?? generateId(),
    orgId: props.orgId,
    imoNumber: props.imoNumber,
    mmsi: props.mmsi,
    name: props.name,
    type: props.type,
    flag: props.flag,
    grossTonnage: props.grossTonnage,
    loa: props.loa,
    beam: props.beam,
    maxDraft: props.maxDraft,
    teuCapacity: props.teuCapacity,
    owner: props.owner,
    operator: props.operator,
    status: props.status,
    createdAt: props.createdAt,
    updatedAt: props.updatedAt,
  })
}

export async function saveVessel(vessel: Vessel, db: DbContext): Promise<void> {
  const snap = vessel.toSnapshot()
  await db.update(vessels)
    .set({ status: snap.status, updatedAt: snap.updatedAt })
    .where(and(eq(vessels.id, snap.id), eq(vessels.orgId, snap.orgId)))
}
