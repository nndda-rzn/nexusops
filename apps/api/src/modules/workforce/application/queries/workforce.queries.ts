import { employees, crews, crewMembers, assignments, certifications, availability } from '@/shared/database/schema/workforce'
import { eq, and, sql } from 'drizzle-orm'
import { normalizePagination, toOffset, paginate } from '@/shared/pagination'
import { EmployeeNotFoundError } from '@/modules/workforce/domain/errors/workforce.errors'
import type { DbContext } from '@/shared/database/client'

export async function listEmployeesQuery(
  orgId: string, db: DbContext,
  params?: { page?: number; limit?: number; status?: string }
) {
  const { page, limit } = normalizePagination(params ?? {})
  const offset = toOffset(page, limit)
  const conditions = [eq(employees.orgId, orgId)]
  if (params?.status) conditions.push(
    eq(employees.status, params.status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'RESIGNED')
  )
  const whereClause = and(...conditions)
  const [rows, [countResult]] = await Promise.all([
    db.select().from(employees).where(whereClause).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(employees).where(whereClause),
  ])
  return paginate(rows, page, limit, countResult?.count ?? 0)
}

export async function getEmployeeQuery(id: string, orgId: string, db: DbContext) {
  const [row] = await db.select().from(employees)
    .where(and(eq(employees.id, id), eq(employees.orgId, orgId))).limit(1)
  if (!row) throw new EmployeeNotFoundError(id)
  return row
}

export async function listCrewsQuery(
  orgId: string, db: DbContext,
  params?: { page?: number; limit?: number }
) {
  const { page, limit } = normalizePagination(params ?? {})
  const offset = toOffset(page, limit)
  const whereClause = eq(crews.orgId, orgId)
  const [rows, [countResult]] = await Promise.all([
    db.select().from(crews).where(whereClause).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(crews).where(whereClause),
  ])
  return paginate(rows, page, limit, countResult?.count ?? 0)
}

export async function listAssignmentsQuery(
  orgId: string, db: DbContext,
  params?: { page?: number; limit?: number; status?: string }
) {
  const { page, limit } = normalizePagination(params ?? {})
  const offset = toOffset(page, limit)
  const conditions = [eq(assignments.orgId, orgId)]
  if (params?.status) conditions.push(
    eq(assignments.status, params.status as 'PLANNED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED')
  )
  const whereClause = and(...conditions)
  const [rows, [countResult]] = await Promise.all([
    db.select().from(assignments).where(whereClause).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(assignments).where(whereClause),
  ])
  return paginate(rows, page, limit, countResult?.count ?? 0)
}

export async function getEmployeeAvailabilityQuery(
  employeeId: string, orgId: string, db: DbContext
) {
  return db.select().from(availability)
    .where(and(eq(availability.employeeId, employeeId), eq(availability.orgId, orgId)))
    .orderBy(availability.date)
}

export async function listCertificationsQuery(
  employeeId: string, orgId: string, db: DbContext
) {
  return db.select().from(certifications)
    .where(and(eq(certifications.employeeId, employeeId), eq(certifications.orgId, orgId)))
    .orderBy(certifications.issuedAt)
}

// P3R-06 FIX: crew member read — members were write-only before
export async function listCrewMembersQuery(crewId: string, db: DbContext) {
  return db.select().from(crewMembers).where(eq(crewMembers.crewId, crewId))
}
