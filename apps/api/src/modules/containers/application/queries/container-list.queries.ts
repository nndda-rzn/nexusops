import {
  containerUnits,
  containerMovements,
  containerHolds,
} from "@/shared/database/schema/containers";
import { eq, and, desc } from "drizzle-orm";
import { ContainerNotFoundError } from "@/modules/containers/domain/errors/container.errors";
import { normalizePagination, toOffset, paginate } from "@/shared/pagination";
import type { DbContext } from "@/shared/database/client";
import type { ContainerStatus } from "@/modules/containers/domain/entities/container.entity";

export async function listContainersQuery(
  orgId: string,
  filter: {
    status?: ContainerStatus | undefined;
    shipmentId?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
  },
  db: DbContext,
) {
  const { page, limit } = normalizePagination({
    page: filter.page,
    limit: filter.limit,
  });
  const offset = toOffset(page, limit);

  const conditions = [eq(containerUnits.orgId, orgId)];
  if (filter.status) conditions.push(eq(containerUnits.status, filter.status));
  if (filter.shipmentId)
    conditions.push(eq(containerUnits.shipmentId, filter.shipmentId));

  const rows = await db
    .select({
      id: containerUnits.id,
      orgId: containerUnits.orgId,
      containerNumber: containerUnits.containerNumber,
      type: containerUnits.type,
      size: containerUnits.size,
      status: containerUnits.status,
      currentLocationType: containerUnits.currentLocationType,
      currentLocationId: containerUnits.currentLocationId,
      shipmentId: containerUnits.shipmentId,
      isHazmat: containerUnits.isHazmat,
      createdAt: containerUnits.createdAt,
      updatedAt: containerUnits.updatedAt,
    })
    .from(containerUnits)
    .where(and(...conditions))
    .orderBy(desc(containerUnits.updatedAt))
    .limit(limit)
    .offset(offset);

  return paginate(
    rows,
    page,
    limit,
    rows.length < limit ? offset + rows.length : offset + rows.length + 1,
  );
}

export async function getContainerMovementsQuery(
  containerId: string,
  orgId: string,
  db: DbContext,
) {
  const [container] = await db
    .select({ id: containerUnits.id })
    .from(containerUnits)
    .where(
      and(eq(containerUnits.id, containerId), eq(containerUnits.orgId, orgId)),
    )
    .limit(1);

  if (!container) throw new ContainerNotFoundError(containerId);

  return db
    .select()
    .from(containerMovements)
    .where(
      and(
        eq(containerMovements.containerId, containerId),
        eq(containerMovements.orgId, orgId),
      ),
    )
    .orderBy(desc(containerMovements.movedAt));
}

export async function getContainerHoldsQuery(
  containerId: string,
  orgId: string,
  db: DbContext,
) {
  const [container] = await db
    .select({ id: containerUnits.id })
    .from(containerUnits)
    .where(
      and(eq(containerUnits.id, containerId), eq(containerUnits.orgId, orgId)),
    )
    .limit(1);

  if (!container) throw new ContainerNotFoundError(containerId);

  return db
    .select()
    .from(containerHolds)
    .where(
      and(
        eq(containerHolds.containerId, containerId),
        eq(containerHolds.orgId, orgId),
      ),
    )
    .orderBy(desc(containerHolds.placedAt));
}
