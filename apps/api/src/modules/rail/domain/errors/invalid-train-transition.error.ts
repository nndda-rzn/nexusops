import { DomainError } from '@/shared/errors'

export class InvalidTrainTransitionError extends DomainError {
  constructor(from: string, to: string) {
    super(
      'invalid-train-transition',
      'Invalid Train Transition',
      `Cannot transition train from '${from}' to '${to}'.`,
      { from, to }
    )
  }
}
