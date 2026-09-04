import { DomainNotFoundError } from '@/shared/errors'

export class VesselNotFoundError extends DomainNotFoundError {
  constructor(id: string) {
    super('vessel-not-found', 'Vessel Not Found', `Vessel '${id}' does not exist.`, { vessel_id: id })
  }
}
