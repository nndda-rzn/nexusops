export interface EmployeeRegisteredEvent {
  type: 'workforce.employee_registered'
  employeeId: string
  orgId: string
  employeeNumber: string
  name: string
  occurredAt: Date
}

export interface EmployeeStatusChangedEvent {
  type: 'workforce.employee_status_changed'
  employeeId: string
  orgId: string
  from: string
  to: string
  occurredAt: Date
  actorId: string
}

export interface WorkforceAssignedEvent {
  type: 'workforce.assigned'
  assignmentId: string
  orgId: string
  employeeId?: string | undefined
  crewId?: string | undefined
  assignmentType: string
  referenceId: string
  referenceType: string
  occurredAt: Date
}

export interface WorkforceAssignmentCompletedEvent {
  type: 'workforce.assignment_completed'
  assignmentId: string
  orgId: string
  occurredAt: Date
}

export interface CertificationExpiringEvent {
  type: 'workforce.certification_expiring'
  certificationId: string
  orgId: string
  employeeId: string
  certificationName: string
  expiresAt: string
  occurredAt: Date
}
