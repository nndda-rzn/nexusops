import { DomainError } from '@/shared/errors'

export class InvalidTripTransitionError extends DomainError {
  constructor(from: string, to: string) {
    super(
      'invalid-trip-transition',
      'Invalid Trip Transition',
      `Cannot transition trip from '${from}' to '${to}'.`,
      { from, to }
    )
  }
}
