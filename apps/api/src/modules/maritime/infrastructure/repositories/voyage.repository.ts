import { voyages } from '@/shared/database/schema/maritime'
import { eq, and } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { VoyageNotFoundError } from '@/modules/maritime/domain/errors/voyage-not-found.error'
import { Voyage } from '@/modules/maritime/domain/entities/voyage.entity'
import type { VoyageProps } from '@/modules/maritime/domain/entities/voyage.entity'
import type { DbContext } from '@/shared/database/client'

type VoyageRow = typeof voyages.$inferSelect

function rowToVoyage(row: VoyageRow): Voyage {
  return Voyage.fromSnapshot({
    id: row.id,
    orgId: row.orgId,
    voyageNumber: row.voyageNumber,
    vesselId: row.vesselId,
    serviceName: row.serviceName ?? undefined,
    departurePortId: row.departurePortId ?? undefined,
    destinationPortId: row.destinationPortId ?? undefined,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  })
}

export async function findVoyageById(id: string, orgId: string, db: DbContext): Promise<Voyage | null> {
  const [row] = await db.select().from(voyages)
    .where(and(eq(voyages.id, id), eq(voyages.orgId, orgId)))
    .limit(1)
  return row ? rowToVoyage(row) : null
}

export async function findVoyageByIdOrFail(id: string, orgId: string, db: DbContext): Promise<Voyage> {
  const voyage = await findVoyageById(id, orgId, db)
  if (!voyage) throw new VoyageNotFoundError(id)
  return voyage
}

export async function insertVoyage(props: VoyageProps, db: DbContext): Promise<void> {
  await db.insert(voyages).values({
    id: props.id ?? generateId(),
    orgId: props.orgId,
    voyageNumber: props.voyageNumber,
    vesselId: props.vesselId,
    serviceName: props.serviceName,
    departurePortId: props.departurePortId,
    destinationPortId: props.destinationPortId,
    status: props.status,
    createdAt: props.createdAt,
    updatedAt: props.updatedAt,
  })
}

export async function saveVoyage(voyage: Voyage, db: DbContext): Promise<void> {
  const snap = voyage.toSnapshot()
  await db.update(voyages)
    .set({ status: snap.status, updatedAt: snap.updatedAt })
    .where(and(eq(voyages.id, snap.id), eq(voyages.orgId, snap.orgId)))
}
