import { DomainError, DomainNotFoundError } from '@/shared/errors'

// L-01 FIX: 404 not 409
export class CraneNotFoundError extends DomainNotFoundError {
  constructor(id: string) {
    super('crane-not-found', 'Crane Not Found', `Crane '${id}' not found.`, { id })
  }
}

export class CraneNotAvailableError extends DomainError {
  constructor(craneId: string, status: string) {
    super('crane-not-available', 'Crane Not Available',
      `Crane '${craneId}' is not available (current status: ${status}).`,
      { crane_id: craneId, status })
  }
}

export class CraneBreakdownError extends DomainError {
  constructor(craneId: string) {
    super('crane-breakdown', 'Crane Breakdown',
      `Crane '${craneId}' has been reported as broken down.`,
      { crane_id: craneId })
  }
}
