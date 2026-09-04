import { DomainError, DomainNotFoundError } from '@/shared/errors'

// L-01 FIX: 404 not 409
export class ShipmentNotFoundError extends DomainNotFoundError {
  constructor(id: string) {
    super('shipment-not-found', 'Shipment Not Found', `Shipment '${id}' not found.`, { id })
  }
}

export class ShipmentAlreadyCompletedError extends DomainError {
  constructor(id: string) {
    super('shipment-already-completed', 'Shipment Already Completed',
      `Shipment '${id}' is already completed.`, { id })
  }
}

// L-01 FIX: 404 not 409
export class ShipmentLegNotFoundError extends DomainNotFoundError {
  constructor(id: string) {
    super('shipment-leg-not-found', 'Shipment Leg Not Found',
      `Shipment leg '${id}' not found.`, { id })
  }
}
