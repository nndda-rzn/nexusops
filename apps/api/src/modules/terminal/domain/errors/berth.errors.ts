import { DomainError, DomainNotFoundError } from '@/shared/errors'

// L-01 FIX: 404 not 409
export class BerthNotFoundError extends DomainNotFoundError {
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
    super('berth-not-eligible', 'Vessel Not Eligible for Berth', reason, details)
  }
}

// L-01 FIX: 404 not 409
export class BerthAssignmentNotFoundError extends DomainNotFoundError {
  constructor(id: string) {
    super('berth-assignment-not-found', 'Berth Assignment Not Found',
      `Berth assignment '${id}' not found.`, { id })
  }
}
