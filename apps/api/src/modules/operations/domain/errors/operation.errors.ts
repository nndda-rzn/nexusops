import { DomainError } from '@/shared/errors'
import type { OperationStatus } from '../entities/operation.entity'

export class InvalidOperationTransitionError extends DomainError {
  constructor(from: OperationStatus, to: OperationStatus) {
    super(
      'invalid-operation-transition',
      'Invalid Operation Transition',
      `Cannot transition operation from '${from}' to '${to}'.`,
      { from, to }
    )
  }
}

export class OperationNotFoundError extends DomainError {
  constructor(id: string) {
    super(
      'operation-not-found',
      'Operation Not Found',
      `Operation '${id}' not found.`,
      { id }
    )
  }
}

export class OperationAlreadyCompletedError extends DomainError {
  constructor(id: string) {
    super(
      'operation-already-completed',
      'Operation Already Completed',
      `Operation '${id}' is already completed and cannot be modified.`,
      { id }
    )
  }
}

export class OperationNotCancellableError extends DomainError {
  constructor(id: string, status: string) {
    super(
      'operation-not-cancellable',
      'Operation Cannot Be Cancelled',
      `Operation '${id}' in status '${status}' cannot be cancelled.`,
      { id, status }
    )
  }
}

export class InterventionNotFoundError extends DomainError {
  constructor(id: string) {
    super(
      'intervention-not-found',
      'Intervention Request Not Found',
      `Intervention request '${id}' not found.`,
      { id }
    )
  }
}

export class InterventionAlreadyRespondedError extends DomainError {
  constructor(id: string, status: string) {
    super(
      'intervention-already-responded',
      'Intervention Already Responded',
      `Intervention request '${id}' has already been ${status}.`,
      { id, status }
    )
  }
}
