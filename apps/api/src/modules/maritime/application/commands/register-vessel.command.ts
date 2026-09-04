import { insertVessel } from '@/modules/maritime/infrastructure/repositories/vessel.repository'
import { Vessel } from '@/modules/maritime/domain/entities/vessel.entity'
import type { VesselType } from '@/modules/maritime/domain/entities/vessel.entity'
import { eventBus } from '@/shared/events'
import { generateId } from '@/shared/ids'
import type { DbContext } from '@/shared/database/client'

export interface RegisterVesselCommand {
  orgId: string
  imoNumber: string
  name: string
  type: VesselType
  mmsi?: string | undefined
  flag?: string | undefined
  grossTonnage?: string | undefined
  loa?: string | undefined
  beam?: string | undefined
  maxDraft?: string | undefined
  teuCapacity?: number | undefined
  owner?: string | undefined
  operator?: string | undefined
}

export async function registerVesselCommand(
  cmd: RegisterVesselCommand,
  db: DbContext
): Promise<{ id: string }> {
  const id = generateId()
  const now = new Date()

  const vessel = Vessel.fromSnapshot({
    id, orgId: cmd.orgId, imoNumber: cmd.imoNumber, name: cmd.name,
    type: cmd.type, mmsi: cmd.mmsi, flag: cmd.flag,
    grossTonnage: cmd.grossTonnage, loa: cmd.loa, beam: cmd.beam,
    maxDraft: cmd.maxDraft, teuCapacity: cmd.teuCapacity,
    owner: cmd.owner, operator: cmd.operator,
    status: 'ACTIVE', createdAt: now, updatedAt: now,
  })

  await insertVessel(vessel.toSnapshot(), db)

  await eventBus.emit('vessel.registered', {
    type: 'vessel.registered',
    vesselId: id, orgId: cmd.orgId,
    imoNumber: cmd.imoNumber, name: cmd.name, vesselType: cmd.type,
    occurredAt: now,
  })

  return { id }
}
