import { insertWorkOrder } from '@/modules/maintenance/infrastructure/repositories/work-order.repository'
import { WorkOrder } from '@/modules/maintenance/domain/entities/work-order.entity'
import type { WorkOrderType, WorkOrderPriority } from '@/modules/maintenance/domain/entities/work-order.entity'
import { eventBus } from '@/shared/events'
import { generateId } from '@/shared/ids'
import type { DbContext } from '@/shared/database/client'

export interface CreateWorkOrderCommand {
  orgId: string
  assetId: string
  type: WorkOrderType
  priority?: WorkOrderPriority | undefined
  title: string
  description?: string | undefined
  scheduledStart?: Date | undefined
  scheduledEnd?: Date | undefined
  estimatedDurationHours?: string | undefined
}

export async function createWorkOrderCommand(
  cmd: CreateWorkOrderCommand,
  db: DbContext
): Promise<{ id: string; workOrderNumber: string }> {
  const id = generateId()
  const workOrderNumber = `WO-${generateId().slice(0, 12).toUpperCase()}`
  const now = new Date()

  const wo = WorkOrder.fromSnapshot({
    id, orgId: cmd.orgId, workOrderNumber,
    assetId: cmd.assetId, type: cmd.type,
    priority: cmd.priority ?? 'NORMAL',
    title: cmd.title, description: cmd.description,
    status: 'DRAFT',
    scheduledStart: cmd.scheduledStart, scheduledEnd: cmd.scheduledEnd,
    createdBy: cmd.orgId,
    createdAt: now, updatedAt: now,
  })

  await insertWorkOrder(wo.toSnapshot(), db)

  await eventBus.emit('maintenance.workorder_created', {
    type: 'maintenance.workorder_created',
    workOrderId: id, orgId: cmd.orgId,
    workOrderNumber, assetId: cmd.assetId,
    workOrderType: cmd.type, priority: cmd.priority ?? 'NORMAL',
    occurredAt: now,
  })

  return { id, workOrderNumber }
}
