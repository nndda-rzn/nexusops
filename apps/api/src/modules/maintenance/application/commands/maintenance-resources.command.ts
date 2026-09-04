import { failures, maintenancePlans, spareParts } from '@/shared/database/schema/maintenance'
import { generateId } from '@/shared/ids'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export interface ReportFailureCommand {
  orgId: string
  assetId: string
  failureType: string
  description: string
  severity: 'MINOR' | 'MAJOR' | 'CRITICAL'
  detectedAt: Date
  detectedBy?: string | undefined
  downtimeStart?: Date | undefined
}

export async function reportFailureCommand(cmd: ReportFailureCommand, db: DbContext): Promise<{ id: string }> {
  const id = generateId()
  await db.insert(failures).values({
    id, orgId: cmd.orgId, assetId: cmd.assetId,
    failureType: cmd.failureType, description: cmd.description,
    severity: cmd.severity, detectedAt: cmd.detectedAt,
    detectedBy: cmd.detectedBy,
    downtimeStart: cmd.downtimeStart,
    createdAt: new Date(),
  })

  await eventBus.emit('maintenance.failure_reported', {
    type: 'maintenance.failure_reported',
    failureId: id, orgId: cmd.orgId,
    assetId: cmd.assetId, severity: cmd.severity,
    occurredAt: new Date(),
  })

  return { id }
}

export interface CreateMaintenancePlanCommand {
  orgId: string
  assetId: string
  planType: 'TIME_BASED' | 'USAGE_BASED' | 'CONDITION_BASED'
  intervalDays?: number | undefined
  intervalHours?: string | undefined
  estimatedDurationHours?: string | undefined
  nextDueDate?: string | undefined
  tasks?: unknown | undefined
  createdBy: string
}

export async function createMaintenancePlanCommand(
  cmd: CreateMaintenancePlanCommand, db: DbContext
): Promise<{ id: string }> {
  const id = generateId()
  const now = new Date()
  await db.insert(maintenancePlans).values({
    id, orgId: cmd.orgId, assetId: cmd.assetId,
    planType: cmd.planType, intervalDays: cmd.intervalDays,
    intervalHours: cmd.intervalHours,
    estimatedDurationHours: cmd.estimatedDurationHours,
    nextDueDate: cmd.nextDueDate,
    tasks: cmd.tasks as Record<string, unknown>,
    status: 'ACTIVE', createdBy: cmd.createdBy,
    createdAt: now, updatedAt: now,
  })
  return { id }
}

export interface CreateSparePartCommand {
  orgId: string
  partNumber: string
  name: string
  quantityOnHand?: string | undefined
  reorderPoint?: string | undefined
  unitCost?: string | undefined
  supplier?: string | undefined
  leadTimeDays?: number | undefined
  location?: string | undefined
}

export async function createSparePartCommand(cmd: CreateSparePartCommand, db: DbContext): Promise<{ id: string }> {
  const id = generateId()
  const now = new Date()
  await db.insert(spareParts).values({
    id, orgId: cmd.orgId, partNumber: cmd.partNumber, name: cmd.name,
    quantityOnHand: cmd.quantityOnHand ?? '0',
    quantityReserved: '0',
    reorderPoint: cmd.reorderPoint ?? '0',
    unitCost: cmd.unitCost, supplier: cmd.supplier,
    leadTimeDays: cmd.leadTimeDays, location: cmd.location,
    createdAt: now, updatedAt: now,
  })
  return { id }
}
