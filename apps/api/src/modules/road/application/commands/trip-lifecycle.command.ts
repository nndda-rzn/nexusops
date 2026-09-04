import {
  findTripByIdOrFail,
  saveTrip,
} from "@/modules/road/infrastructure/repositories/trip.repository";
import { vehicles, drivers } from "@/shared/database/schema/road";
import { eq, and } from "drizzle-orm";
import { ForbiddenError, DomainError } from "@/shared/errors";
import { eventBus } from "@/shared/events";
import type { DbContext } from "@/shared/database/client";

export async function assignTripCommand(
  cmd: { tripId: string; orgId: string; vehicleId: string; driverId: string },
  db: DbContext,
): Promise<void> {
  const trip = await findTripByIdOrFail(cmd.tripId, cmd.orgId, db);

  // Q-05 FIX: validate vehicle availability before assignment
  const [vehicle] = await db
    .select({ id: vehicles.id, status: vehicles.status })
    .from(vehicles)
    .where(and(eq(vehicles.id, cmd.vehicleId), eq(vehicles.orgId, cmd.orgId)))
    .limit(1);
  if (!vehicle)
    throw new DomainError(
      "vehicle-not-found",
      "Vehicle Not Found",
      `Vehicle '${cmd.vehicleId}' does not exist.`,
    );
  if (vehicle.status !== "AVAILABLE") {
    throw new ForbiddenError(
      `Vehicle '${cmd.vehicleId}' is not available (status: ${vehicle.status}).`,
      { vehicle_id: cmd.vehicleId, status: vehicle.status },
    );
  }

  // Q-05 FIX: validate driver availability before assignment
  const [driver] = await db
    .select({ id: drivers.id, status: drivers.status })
    .from(drivers)
    .where(and(eq(drivers.id, cmd.driverId), eq(drivers.orgId, cmd.orgId)))
    .limit(1);
  if (!driver)
    throw new DomainError(
      "driver-not-found",
      "Driver Not Found",
      `Driver '${cmd.driverId}' does not exist.`,
    );
  if (driver.status !== "AVAILABLE") {
    throw new ForbiddenError(
      `Driver '${cmd.driverId}' is not available (status: ${driver.status}).`,
      { driver_id: cmd.driverId, status: driver.status },
    );
  }

  trip.assign(cmd.vehicleId, cmd.driverId);
  trip.transition("ASSIGNED");
  await saveTrip(trip, db);
}

export async function dispatchTripCommand(
  cmd: { tripId: string; orgId: string; dispatcherId: string },
  db: DbContext,
): Promise<void> {
  const trip = await findTripByIdOrFail(cmd.tripId, cmd.orgId, db);
  trip.dispatch(cmd.dispatcherId);
  trip.transition("DISPATCHED");
  await saveTrip(trip, db);

  await eventBus.emit("trip.dispatched", {
    type: "trip.dispatched",
    tripId: cmd.tripId,
    orgId: cmd.orgId,
    referenceNumber: trip.referenceNumber,
    vehicleId: trip.toSnapshot().vehicleId,
    driverId: trip.toSnapshot().driverId,
    occurredAt: new Date(),
  });
}

export async function departTripCommand(
  cmd: { tripId: string; orgId: string; actualDeparture?: Date },
  db: DbContext,
): Promise<void> {
  const trip = await findTripByIdOrFail(cmd.tripId, cmd.orgId, db);
  const actualDeparture = cmd.actualDeparture ?? new Date();
  trip.recordDeparture(actualDeparture);
  trip.transition("EN_ROUTE");
  await saveTrip(trip, db);

  await eventBus.emit("trip.departed", {
    type: "trip.departed",
    tripId: cmd.tripId,
    orgId: cmd.orgId,
    referenceNumber: trip.referenceNumber,
    actualDeparture,
    occurredAt: new Date(),
  });
}

export async function arriveTripCommand(
  cmd: { tripId: string; orgId: string; actualArrival?: Date },
  db: DbContext,
): Promise<void> {
  const trip = await findTripByIdOrFail(cmd.tripId, cmd.orgId, db);
  const actualArrival = cmd.actualArrival ?? new Date();
  trip.recordArrival(actualArrival);
  trip.transition("ARRIVED_DESTINATION");
  await saveTrip(trip, db);

  await eventBus.emit("trip.arrived", {
    type: "trip.arrived",
    tripId: cmd.tripId,
    orgId: cmd.orgId,
    referenceNumber: trip.referenceNumber,
    actualArrival,
    occurredAt: new Date(),
  });
}

export async function completeTripCommand(
  cmd: { tripId: string; orgId: string },
  db: DbContext,
): Promise<void> {
  const trip = await findTripByIdOrFail(cmd.tripId, cmd.orgId, db);
  trip.transition("COMPLETED");
  await saveTrip(trip, db);

  await eventBus.emit("trip.completed", {
    type: "trip.completed",
    tripId: cmd.tripId,
    orgId: cmd.orgId,
    referenceNumber: trip.referenceNumber,
    occurredAt: new Date(),
  });
}
