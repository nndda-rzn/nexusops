import { plans, schedules } from '@/shared/database/schema/planning'
import { eq, and, sql } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import type { DbContext } from '@/shared/database/client'

// ─── Schedules ───

export async function insertScheduleEntries(
  orgId: string, planId: string, entries: Array<{
    resourceType: string; resourceId: string; startTime: Date; endTime: Date;
    operationId?: string; metadata?: unknown
  }>, db: DbContext
): Promise<void> {
  if (entries.length === 0) return
  const rows: Array<typeof schedules.$inferInsert> = entries.map((e) => ({
    id: generateId(),
    orgId, planId,
    resourceType: e.resourceType, resourceId: e.resourceId,
    startTime: e.startTime, endTime: e.endTime,
    operationId: e.operationId ?? null,
    metadata: (e.metadata as object | null) ?? null,
    status: 'PLANNED',
    createdAt: new Date(),
  }))
  await db.insert(schedules).values(rows)
}

export async function listPlanSchedules(planId: string, orgId: string, db: DbContext) {
  return db.select().from(schedules)
    .where(and(eq(schedules.planId, planId), eq(schedules.orgId, orgId)))
    .orderBy(schedules.startTime)
}

// Check overlap between a candidate window and any ACTIVE/PLANNED schedule
// for the same resource (PLANNED schedules belong to the ACTIVE plan of its type).
export async function findResourceOverlaps(
  orgId: string, resourceType: string, resourceId: string,
  startTime: Date, endTime: Date, db: DbContext
): Promise<Array<{ scheduleId: string; planId: string; startTime: Date; endTime: Date }>> {
  const rows = await db.select({
    scheduleId: schedules.id, planId: schedules.planId,
    startTime: schedules.startTime, endTime: schedules.endTime,
  }).from(schedules)
    .innerJoin(plans, eq(plans.id, schedules.planId))
    .where(and(
      eq(schedules.orgId, orgId),
      eq(schedules.resourceType, resourceType),
      eq(schedules.resourceId, resourceId),
      eq(plans.status, 'ACTIVE'),
      sql`${schedules.startTime} < ${endTime}`,
      sql`${schedules.endTime} > ${startTime}`,
    ))
  return rows
}