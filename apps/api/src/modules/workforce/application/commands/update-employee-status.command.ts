import { findEmployeeByIdOrFail, saveEmployee } from '@/modules/workforce/infrastructure/repositories/employee.repository'
import type { EmployeeStatus } from '@/modules/workforce/domain/entities/employee.entity'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export interface UpdateEmployeeStatusCommand {
  employeeId: string
  orgId: string
  status: EmployeeStatus
  actorId: string
}

export async function updateEmployeeStatusCommand(
  cmd: UpdateEmployeeStatusCommand,
  db: DbContext
): Promise<void> {
  const employee = await findEmployeeByIdOrFail(cmd.employeeId, cmd.orgId, db)
  const from = employee.status
  employee.updateStatus(cmd.status)
  await saveEmployee(employee, db)

  await eventBus.emit('workforce.employee_status_changed', {
    type: 'workforce.employee_status_changed',
    employeeId: cmd.employeeId, orgId: cmd.orgId,
    from, to: cmd.status,
    occurredAt: new Date(), actorId: cmd.actorId,
  })
}
