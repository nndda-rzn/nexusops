import type { DbContext } from "@/shared/database/client";
import {
  containerUnits,
  containerMovements,
} from "@/shared/database/schema/containers";
import { eq, and, desc } from "drizzle-orm";
import { Container } from "@/modules/containers/domain/entities/container.entity";
import { ContainerNotFoundError } from "@/modules/containers/domain/errors/container.errors";
import { generateId } from "@/shared/ids";
import type {
  ContainerStatus,
  ContainerType,
  ContainerSize,
} from "@/modules/containers/domain/entities/container.entity";

function rowToContainer(row: typeof containerUnits.$inferSelect): Container {
  return Container.reconstitute({
    id: row.id,
    orgId: row.orgId,
    containerNumber: row.containerNumber,
    type: row.type as ContainerType,
    size: row.size as ContainerSize,
    status: row.status as ContainerStatus,
    currentLocationId: row.currentLocationId ?? undefined,
    currentLocationType: row.currentLocationType ?? undefined,
    shipmentId: row.shipmentId ?? undefined,
    vesselId: row.vesselId ?? undefined,
    sealNumber: row.sealNumber ?? undefined,
    isHazmat: row.isHazmat,
    hazmatClass: row.hazmatClass ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export async function findContainerById(
  id: string,
  db: DbContext,
): Promise<Container | null> {
  const [row] = await db
    .select()
    .from(containerUnits)
    .where(eq(containerUnits.id, id))
    .limit(1);
  return row ? rowToContainer(row) : null;
}

export async function findContainerByIdOrFail(
  id: string,
  db: DbContext,
): Promise<Container> {
  const container = await findContainerById(id, db);
  if (!container) throw new ContainerNotFoundError(id);
  return container;
}

export async function findContainerByNumber(
  orgId: string,
  containerNumber: string,
  db: DbContext,
): Promise<Container | null> {
  const [row] = await db
    .select()
    .from(containerUnits)
    .where(
      and(
        eq(containerUnits.orgId, orgId),
        eq(containerUnits.containerNumber, containerNumber.toUpperCase()),
      ),
    )
    .limit(1);
  return row ? rowToContainer(row) : null;
}

export async function saveContainer(
  container: Container,
  db: DbContext,
): Promise<void> {
  await db
    .insert(containerUnits)
    .values({
      id: container.id,
      orgId: container.orgId,
      containerNumber: container.containerNumber,
      type: container.type,
      size: container.size,
      status: container.status,
      currentLocationId: container.currentLocationId,
      currentLocationType: container.currentLocationType,
      shipmentId: container.shipmentId,
      vesselId: container.vesselId,
      sealNumber: container.sealNumber,
      isHazmat: container.isHazmat,
      hazmatClass: container.hazmatClass,
      createdAt: container.createdAt,
      updatedAt: container.updatedAt,
    })
    .onConflictDoUpdate({
      target: containerUnits.id,
      set: {
        status: container.status,
        currentLocationId: container.currentLocationId,
        currentLocationType: container.currentLocationType,
        updatedAt: container.updatedAt,
      },
    });
}

export async function appendContainerMovement(
  params: {
    containerId: string;
    orgId: string;
    movementType: string;
    fromLocationType?: string | undefined;
    fromLocationId?: string | undefined;
    toLocationType: string;
    toLocationId: string;
    equipmentId?: string | undefined;
    operatorId?: string | undefined;
    notes?: string | undefined;
  },
  db: DbContext,
): Promise<void> {
  await db.insert(containerMovements).values({
    id: generateId(),
    orgId: params.orgId,
    containerId: params.containerId,
    movementType:
      params.movementType as (typeof containerMovements.$inferInsert)["movementType"],
    fromLocationType: params.fromLocationType,
    fromLocationId: params.fromLocationId,
    toLocationType: params.toLocationType,
    toLocationId: params.toLocationId,
    equipmentId: params.equipmentId,
    operatorId: params.operatorId,
    notes: params.notes,
    movedAt: new Date(),
    isException: false,
  });
}

export async function listContainersByStatus(
  orgId: string,
  status: ContainerStatus,
  db: DbContext,
): Promise<Container[]> {
  const rows = await db
    .select()
    .from(containerUnits)
    .where(
      and(eq(containerUnits.orgId, orgId), eq(containerUnits.status, status)),
    )
    .orderBy(desc(containerUnits.updatedAt))
    .limit(100);
  return rows.map(rowToContainer);
}
