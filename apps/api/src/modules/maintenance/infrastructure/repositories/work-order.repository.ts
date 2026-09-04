import { workOrders } from '@/shared/database/schema/maintenance'
import { eq, and } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { WorkOrderNotFoundError } from '@/modules/maintenance/domain/errors/maintenance.errors'
import { WorkOrder } from '@/modules/maintenance/domain/entities/work-order.entity'
import type { WorkOrderProps } from '@/modules/maintenance/domain/entities/work-order.entity'
import type { DbContext } from '@/shared/database/client'

type WorkOrderRow = typeof workOrders.$inferSelect

function rowToWorkOrder(row: WorkOrderRow): WorkOrder {
  return WorkOrder.fromSnapshot({
    id: row.id, orgId: row.orgId,
    workOrderNumber: row.workOrderNumber,
    assetId: row.assetId, type: row.type,
    priority: row.priority, title: row.title,
    description: row.description ?? undefined,
    status: row.status,
    assignedTo: row.assignedTo ?? undefined,
    approvedBy: row.approvedBy ?? undefined,
    approvedAt: row.approvedAt ?? undefined,
    scheduledStart: row.scheduledStart ?? undefined,
    scheduledEnd: row.scheduledEnd ?? undefined,
    actualStart: row.actualStart ?? undefined,
    actualEnd: row.actualEnd ?? undefined,
    createdBy: row.createdBy,
    createdAt: row.createdAt, updatedAt: row.updatedAt,
  })
}

export async function findWorkOrderById(id: string, orgId: string, db: DbContext): Promise<WorkOrder | null> {
  const [row] = await db.select().from(workOrders)
    .where(and(eq(workOrders.id, id), eq(workOrders.orgId, orgId))).limit(1)
  return row ? rowToWorkOrder(row) : null
}

export async function findWorkOrderByIdOrFail(id: string, orgId: string, db: DbContext): Promise<WorkOrder> {
  const wo = await findWorkOrderById(id, orgId, db)
  if (!wo) throw new WorkOrderNotFoundError(id)
  return wo
}

export async function insertWorkOrder(props: WorkOrderProps, db: DbContext): Promise<void> {
  await db.insert(workOrders).values({
    id: props.id ?? generateId(),
    orgId: props.orgId, workOrderNumber: props.workOrderNumber,
    assetId: props.assetId, type: props.type,
    priority: props.priority, title: props.title,
    description: props.description, status: props.status,
    assignedTo: props.assignedTo, approvedBy: props.approvedBy,
    approvedAt: props.approvedAt,
    scheduledStart: props.scheduledStart, scheduledEnd: props.scheduledEnd,
    createdBy: props.createdBy,
    createdAt: props.createdAt, updatedAt: props.updatedAt,
  })
}

export async function saveWorkOrder(wo: WorkOrder, db: DbContext): Promise<void> {
  const snap = wo.toSnapshot()
  await db.update(workOrders)
    .set({
      status: snap.status, assignedTo: snap.assignedTo,
      approvedBy: snap.approvedBy, approvedAt: snap.approvedAt,
      actualStart: snap.actualStart, actualEnd: snap.actualEnd,
      updatedAt: snap.updatedAt,
    })
    .where(and(eq(workOrders.id, snap.id), eq(workOrders.orgId, snap.orgId)))
}
