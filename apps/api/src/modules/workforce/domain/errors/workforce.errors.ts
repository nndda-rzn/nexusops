import { DomainNotFoundError } from '@/shared/errors'

export class EmployeeNotFoundError extends DomainNotFoundError {
  constructor(id: string) {
    super('employee-not-found', 'Employee Not Found', `Employee '${id}' does not exist.`, { employee_id: id })
  }
}

export class CrewNotFoundError extends DomainNotFoundError {
  constructor(id: string) {
    super('crew-not-found', 'Crew Not Found', `Crew '${id}' does not exist.`, { crew_id: id })
  }
}

export class AssignmentNotFoundError extends DomainNotFoundError {
  constructor(id: string) {
    super('assignment-not-found', 'Assignment Not Found', `Assignment '${id}' does not exist.`, { assignment_id: id })
  }
}
