import { DomainNotFoundError } from '@/shared/errors'

export class VoyageNotFoundError extends DomainNotFoundError {
  constructor(id: string) {
    super('voyage-not-found', 'Voyage Not Found', `Voyage '${id}' does not exist.`, { voyage_id: id })
  }
}
