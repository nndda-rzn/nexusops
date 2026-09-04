import { DomainError } from '@/shared/errors'

export class HandoverNotFoundError extends DomainError {
  constructor(id: string) {
    super('handover-not-found', 'Handover Not Found', `Handover request '${id}' not found.`, { id })
  }
}

export class HandoverAlreadyRespondedError extends DomainError {
  constructor(id: string, status: string) {
    super('handover-already-responded', 'Handover Already Responded',
      `Handover '${id}' has already been ${status}.`, { id, status })
  }
}
