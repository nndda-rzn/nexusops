import { DomainError } from '@/shared/errors'

export class BerthNotFoundError extends DomainError {
  constructor(id: string) {
    super('berth-not-found', 'Berth Not Found', `Berth '${id}' not found.`, { id })
  }
}

export class BerthNotAvailableError extends DomainError {
  constructor(berthId: string, status: string) {
    super('berth-not-available', 'Berth Not Available',
      `Berth '${berthId}' is not available (current status: ${status}).`,
      { berth_id: berthId, status })
  }
}

export class BerthOverlapError extends DomainError {
  constructor(berthId: string) {
    super('berth-overlap', 'Berth Assignment Overlap',
      `Berth '${berthId}' already has an active assignment for the requested time window.`,
      { berth_id: berthId })
  }
}

export class VesselNotEligibleError extends DomainError {
  constructor(reason: string, details?: Record<string, unknown>) {
    super('berth-not-eligible', 'Vessel Not Eligible for Berth',
      reason, details)
  }
}

export class BerthAssignmentNotFoundError extends DomainError {
  constructor(id: string) {
    super('berth-assignment-not-found', 'Berth Assignment Not Found',
      `Berth assignment '${id}' not found.`, { id })
  }
}
