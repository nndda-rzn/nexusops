import { DomainError } from "@/shared/errors";

export class ShipmentNotFoundError extends DomainError {
  constructor(id: string) {
    super(
      "shipment-not-found",
      "Shipment Not Found",
      `Shipment '${id}' not found.`,
      { id },
    );
  }
}

export class ShipmentAlreadyCompletedError extends DomainError {
  constructor(id: string) {
    super(
      "shipment-already-completed",
      "Shipment Already Completed",
      `Shipment '${id}' is already completed.`,
      { id },
    );
  }
}

export class ShipmentLegNotFoundError extends DomainError {
  constructor(id: string) {
    super(
      "shipment-leg-not-found",
      "Shipment Leg Not Found",
      `Shipment leg '${id}' not found.`,
      { id },
    );
  }
}
