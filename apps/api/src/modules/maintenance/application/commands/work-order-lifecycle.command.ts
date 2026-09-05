import { findWorkOrderByIdOrFail, saveWorkOrder } from '@/modules/maintenance/infrastructure/repositories/work-order.repository'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export interface ApproveWorkOrderCommand { workOrderId: string; orgId: string; approvedBy: string }
export interface AssignWorkOrderCommand { workOrderId: string; orgId: string; assignedTo: string }
export interface StartWorkOrderCommand { workOrderId: string; orgId: string }
export interface CompleteWorkOrderCommand { workOrderId: string; orgId: string }
export interface CloseWorkOrderCommand { workOrderId: string; orgId: string }
export interface EmergencyStartWorkOrderCommand { workOrderId: string; orgId: string; assignedTo: string }

export async function approveWorkOrderCommand(cmd: ApproveWorkOrderCommand, db: DbContext): Promise<void> {
  const wo = await findWorkOrderByIdOrFail(cmd.workOrderId, cmd.orgId, db)
  wo.approve(cmd.approvedBy)
  await saveWorkOrder(wo, db)
}

// P3R-06 FIX: EMERGENCY work orders skip approve/assign — start directly
export async function emergencyStartWorkOrderCommand(cmd: EmergencyStartWorkOrderCommand, db: DbContext): Promise<void> {
  const wo = await findWorkOrderByIdOrFail(cmd.workOrderId, cmd.orgId, db)
  wo.emergencyStart(cmd.assignedTo)
  await saveWorkOrder(wo, db)
}

export async function assignWorkOrderCommand(cmd: AssignWorkOrderCommand, db: DbContext): Promise<void> {
  const wo = await findWorkOrderByIdOrFail(cmd.workOrderId, cmd.orgId, db)
  wo.assign(cmd.assignedTo)
  await saveWorkOrder(wo, db)
}

export async function startWorkOrderCommand(cmd: StartWorkOrderCommand, db: DbContext): Promise<void> {
  const wo = await findWorkOrderByIdOrFail(cmd.workOrderId, cmd.orgId, db)
  wo.start()
  await saveWorkOrder(wo, db)

  await eventBus.emit('maintenance.workorder_started', {
    type: 'maintenance.workorder_started',
    workOrderId: cmd.workOrderId, orgId: cmd.orgId,
    assetId: wo.toSnapshot().assetId, occurredAt: new Date(),
  })
}

export async function completeWorkOrderCommand(cmd: CompleteWorkOrderCommand, db: DbContext): Promise<void> {
  const wo = await findWorkOrderByIdOrFail(cmd.workOrderId, cmd.orgId, db)
  wo.complete()
  await saveWorkOrder(wo, db)

  await eventBus.emit('maintenance.workorder_completed', {
    type: 'maintenance.workorder_completed',
    workOrderId: cmd.workOrderId, orgId: cmd.orgId,
    assetId: wo.toSnapshot().assetId, occurredAt: new Date(),
  })
}

export async function closeWorkOrderCommand(cmd: CloseWorkOrderCommand, db: DbContext): Promise<void> {
  const wo = await findWorkOrderByIdOrFail(cmd.workOrderId, cmd.orgId, db)
  wo.transition('CLOSED')
  await saveWorkOrder(wo, db)

  await eventBus.emit('maintenance.workorder_closed', {
    type: 'maintenance.workorder_closed',
    workOrderId: cmd.workOrderId, orgId: cmd.orgId, occurredAt: new Date(),
  })
}
