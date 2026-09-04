import { vehicles, drivers } from '@/shared/database/schema/road'
import { generateId } from '@/shared/ids'
import type { DbContext } from '@/shared/database/client'

export interface RegisterVehicleCommand {
  orgId: string
  plateNumber: string
  type: 'TRUCK' | 'TRAILER' | 'PICKUP' | 'VAN'
  brand?: string | undefined
  model?: string | undefined
  year?: number | undefined
  capacityWeight?: string | undefined
  capacityVolume?: string | undefined
  containerCapable?: boolean | undefined
  hasReefer?: boolean | undefined
  assetId?: string | undefined
}

export async function registerVehicleCommand(
  cmd: RegisterVehicleCommand, db: DbContext
): Promise<{ id: string }> {
  const id = generateId()
  const now = new Date()
  await db.insert(vehicles).values({
    id, orgId: cmd.orgId, plateNumber: cmd.plateNumber,
    type: cmd.type, brand: cmd.brand, model: cmd.model,
    year: cmd.year, capacityWeight: cmd.capacityWeight,
    capacityVolume: cmd.capacityVolume,
    containerCapable: cmd.containerCapable ?? false,
    hasReefer: cmd.hasReefer ?? false,
    assetId: cmd.assetId,
    status: 'AVAILABLE', createdAt: now, updatedAt: now,
  })
  return { id }
}

export interface RegisterDriverCommand {
  orgId: string
  licenseNumber: string
  licenseType: string
  licenseExpiry: Date
  employeeId?: string | undefined
}

export async function registerDriverCommand(
  cmd: RegisterDriverCommand, db: DbContext
): Promise<{ id: string }> {
  const id = generateId()
  const now = new Date()
  await db.insert(drivers).values({
    id, orgId: cmd.orgId, licenseNumber: cmd.licenseNumber,
    licenseType: cmd.licenseType, licenseExpiry: cmd.licenseExpiry,
    employeeId: cmd.employeeId,
    status: 'AVAILABLE', createdAt: now, updatedAt: now,
  })
  return { id }
}
