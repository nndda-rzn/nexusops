import { DomainNotFoundError, DomainError } from '@/shared/errors'

export class YardNotFoundError extends DomainNotFoundError {
  constructor(id: string) {
    super('yard-not-found', 'Yard Not Found', `Yard '${id}' does not exist.`, { yard_id: id })
  }
}
export class SlotNotFoundError extends DomainNotFoundError {
  constructor(id: string) {
    super('slot-not-found', 'Slot Not Found', `Slot '${id}' does not exist.`, { slot_id: id })
  }
}
export class SlotNotAvailableError extends DomainError {
  constructor(id: string, status: string) {
    super('slot-not-available', 'Slot Not Available', `Slot '${id}' is not available (status: ${status}).`, { slot_id: id, status })
  }
}
