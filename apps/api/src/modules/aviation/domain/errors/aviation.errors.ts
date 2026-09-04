import { DomainNotFoundError } from '@/shared/errors'

export class FlightNotFoundError extends DomainNotFoundError {
  constructor(id: string) {
    super('flight-not-found', 'Flight Not Found', `Flight '${id}' does not exist.`, { flight_id: id })
  }
}
export class AircraftNotFoundError extends DomainNotFoundError {
  constructor(id: string) {
    super('aircraft-not-found', 'Aircraft Not Found', `Aircraft '${id}' does not exist.`, { aircraft_id: id })
  }
}
export class AwbNotFoundError extends DomainNotFoundError {
  constructor(id: string) {
    super('awb-not-found', 'AWB Not Found', `Airway bill '${id}' does not exist.`, { awb_id: id })
  }
}
