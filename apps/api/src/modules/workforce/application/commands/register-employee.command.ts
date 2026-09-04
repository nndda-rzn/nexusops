import { insertEmployee } from '@/modules/workforce/infrastructure/repositories/employee.repository'
import { Employee } from '@/modules/workforce/domain/entities/employee.entity'
import type { EmployeeType } from '@/modules/workforce/domain/entities/employee.entity'
import { eventBus } from '@/shared/events'
import { generateId } from '@/shared/ids'
import type { DbContext } from '@/shared/database/client'

export interface RegisterEmployeeCommand {
  orgId: string
  employeeNumber: string
  name: string
  email: string
  type: EmployeeType
  joinDate: string
  phone?: string | undefined
  department?: string | undefined
  position?: string | undefined
  userId?: string | undefined
}

export async function registerEmployeeCommand(
  cmd: RegisterEmployeeCommand,
  db: DbContext
): Promise<{ id: string }> {
  const id = generateId()
  const now = new Date()

  const employee = Employee.fromSnapshot({
    id, orgId: cmd.orgId, userId: cmd.userId,
    employeeNumber: cmd.employeeNumber,
    name: cmd.name, email: cmd.email,
    phone: cmd.phone, department: cmd.department,
    position: cmd.position, type: cmd.type,
    joinDate: cmd.joinDate, status: 'ACTIVE',
    createdAt: now, updatedAt: now,
  })

  await insertEmployee(employee.toSnapshot(), db)

  await eventBus.emit('workforce.employee_registered', {
    type: 'workforce.employee_registered',
    employeeId: id, orgId: cmd.orgId,
    employeeNumber: cmd.employeeNumber,
    name: cmd.name, occurredAt: now,
  })

  return { id }
}
