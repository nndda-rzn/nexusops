import { employees } from '@/shared/database/schema/workforce'
import { eq, and } from 'drizzle-orm'
import { generateId } from '@/shared/ids'
import { EmployeeNotFoundError } from '@/modules/workforce/domain/errors/workforce.errors'
import { Employee } from '@/modules/workforce/domain/entities/employee.entity'
import type { EmployeeProps } from '@/modules/workforce/domain/entities/employee.entity'
import type { DbContext } from '@/shared/database/client'

type EmployeeRow = typeof employees.$inferSelect

function rowToEmployee(row: EmployeeRow): Employee {
  return Employee.fromSnapshot({
    id: row.id, orgId: row.orgId,
    userId: row.userId ?? undefined,
    employeeNumber: row.employeeNumber,
    name: row.name, email: row.email,
    phone: row.phone ?? undefined,
    department: row.department ?? undefined,
    position: row.position ?? undefined,
    type: row.type, joinDate: row.joinDate,
    status: row.status,
    createdAt: row.createdAt, updatedAt: row.updatedAt,
  })
}

export async function findEmployeeById(id: string, orgId: string, db: DbContext): Promise<Employee | null> {
  const [row] = await db.select().from(employees)
    .where(and(eq(employees.id, id), eq(employees.orgId, orgId))).limit(1)
  return row ? rowToEmployee(row) : null
}

export async function findEmployeeByIdOrFail(id: string, orgId: string, db: DbContext): Promise<Employee> {
  const emp = await findEmployeeById(id, orgId, db)
  if (!emp) throw new EmployeeNotFoundError(id)
  return emp
}

export async function insertEmployee(props: EmployeeProps, db: DbContext): Promise<void> {
  await db.insert(employees).values({
    id: props.id ?? generateId(),
    orgId: props.orgId, userId: props.userId,
    employeeNumber: props.employeeNumber,
    name: props.name, email: props.email,
    phone: props.phone, department: props.department,
    position: props.position, type: props.type,
    joinDate: props.joinDate, status: props.status,
    createdAt: props.createdAt, updatedAt: props.updatedAt,
  })
}

export async function saveEmployee(employee: Employee, db: DbContext): Promise<void> {
  const snap = employee.toSnapshot()
  await db.update(employees)
    .set({ status: snap.status, updatedAt: snap.updatedAt })
    .where(and(eq(employees.id, snap.id), eq(employees.orgId, snap.orgId)))
}
