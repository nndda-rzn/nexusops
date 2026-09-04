import { findContainerByIdOrFail } from '@/modules/containers/infrastructure/repositories/container.repository'
import type { DbContext } from '@/shared/database/client'

export async function getContainerQuery(containerId: string, db: DbContext) {
  const c = await findContainerByIdOrFail(containerId, db)
  return {
    id: c.id, orgId: c.orgId,
    containerNumber: c.containerNumber,
    type: c.type, size: c.size, status: c.status,
    currentLocationId: c.currentLocationId,
    currentLocationType: c.currentLocationType,
    shipmentId: c.shipmentId, vesselId: c.vesselId,
    sealNumber: c.sealNumber, isHazmat: c.isHazmat,
    hazmatClass: c.hazmatClass,
    createdAt: c.createdAt, updatedAt: c.updatedAt,
  }
}
