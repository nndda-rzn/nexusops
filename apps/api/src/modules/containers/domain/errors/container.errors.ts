import { DomainError, DomainNotFoundError } from '@/shared/errors'

// L-01 FIX: 404 not 409
export class ContainerNotFoundError extends DomainNotFoundError {
  constructor(id: string) {
    super('container-not-found', 'Container Not Found',
      `Container '${id}' not found.`, { id })
  }
}

export class InvalidContainerNumberError extends DomainError {
  constructor(number: string) {
    super('invalid-container-number', 'Invalid Container Number',
      `'${number}' is not a valid ISO container number.`, { number })
  }
}

export class InvalidContainerTransitionError extends DomainError {
  constructor(from: string, to: string) {
    super('invalid-container-transition', 'Invalid Container Transition',
      `Cannot transition container from '${from}' to '${to}'.`, { from, to })
  }
}

export class ContainerHoldActiveError extends DomainError {
  constructor(containerId: string, holdType: string) {
    super('container-hold-active', 'Container Has Active Hold',
      `Container '${containerId}' cannot proceed because it has an active ${holdType}.`,
      { container_id: containerId, hold_type: holdType })
  }
}

export class ContainerAlreadyGateOutError extends DomainError {
  constructor(containerId: string) {
    super('container-already-gate-out', 'Container Already Gate Out',
      `Container '${containerId}' has already exited the terminal.`,
      { container_id: containerId })
  }
}
