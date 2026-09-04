import { DomainNotFoundError } from '@/shared/errors'

export class VehicleNotFoundError extends DomainNotFoundError {
  constructor(id: string) {
    super('vehicle-not-found', 'Vehicle Not Found', `Vehicle '${id}' does not exist.`, { vehicle_id: id })
  }
}

export class DriverNotFoundError extends DomainNotFoundError {
  constructor(id: string) {
    super('driver-not-found', 'Driver Not Found', `Driver '${id}' does not exist.`, { driver_id: id })
  }
}

export class TripNotFoundError extends DomainNotFoundError {
  constructor(id: string) {
    super('trip-not-found', 'Trip Not Found', `Trip '${id}' does not exist.`, { trip_id: id })
  }
}
