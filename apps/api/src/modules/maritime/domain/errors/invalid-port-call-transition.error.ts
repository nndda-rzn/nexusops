import { DomainError } from '@/shared/errors'

export class InvalidPortCallTransitionError extends DomainError {
  constructor(from: string, to: string) {
    super(
      'invalid-port-call-transition',
      'Invalid Port Call Transition',
      `Cannot transition port call from '${from}' to '${to}'.`,
      { from, to }
    )
  }
}
