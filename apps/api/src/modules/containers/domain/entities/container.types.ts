export const CONTAINER_STATUSES = [
  "ANNOUNCED",
  "ON_VESSEL",
  "DISCHARGED",
  "IN_TRANSFER",
  "IN_YARD",
  "RELEASED",
  "GATE_OUT",
  "CUSTOMS_HOLD",
  "DAMAGED",
  "INSPECTION",
  "TRANSSHIPMENT",
] as const;

export const CONTAINER_TYPES = [
  "DRY",
  "REEFER",
  "OPEN_TOP",
  "FLAT_RACK",
  "TANK",
] as const;
export const CONTAINER_SIZES = ["20FT", "40FT", "40FT_HC", "45FT"] as const;
export const MOVEMENT_TYPES = [
  "DISCHARGE",
  "LOAD",
  "YARD_MOVE",
  "GATE_IN",
  "GATE_OUT",
  "RESHUFFLE",
] as const;
export const HOLD_TYPES = [
  "CUSTOMS_HOLD",
  "PAYMENT_HOLD",
  "DAMAGE_HOLD",
  "INSPECTION_HOLD",
] as const;

export type ContainerStatus = (typeof CONTAINER_STATUSES)[number];
export type ContainerType = (typeof CONTAINER_TYPES)[number];
export type ContainerSize = (typeof CONTAINER_SIZES)[number];
export type MovementType = (typeof MOVEMENT_TYPES)[number];
export type HoldType = (typeof HOLD_TYPES)[number];

// Valid state transitions
export const VALID_CONTAINER_TRANSITIONS: Record<
  ContainerStatus,
  ContainerStatus[]
> = {
  ANNOUNCED: ["ON_VESSEL", "CUSTOMS_HOLD"],
  ON_VESSEL: ["DISCHARGED"],
  DISCHARGED: ["IN_TRANSFER", "IN_YARD", "CUSTOMS_HOLD", "INSPECTION"],
  IN_TRANSFER: ["IN_YARD", "CUSTOMS_HOLD"],
  IN_YARD: [
    "RELEASED",
    "CUSTOMS_HOLD",
    "DAMAGED",
    "INSPECTION",
    "TRANSSHIPMENT",
  ],
  RELEASED: ["GATE_OUT"],
  GATE_OUT: [],
  CUSTOMS_HOLD: ["IN_YARD", "GATE_OUT"],
  DAMAGED: ["IN_YARD", "INSPECTION"],
  INSPECTION: ["IN_YARD", "CUSTOMS_HOLD", "DAMAGED"],
  TRANSSHIPMENT: ["ON_VESSEL"],
};

export interface CreateContainerProps {
  orgId: string;
  containerNumber: string;
  type: ContainerType;
  size: ContainerSize;
  shipmentId?: string | undefined;
  vesselId?: string | undefined;
  sealNumber?: string | undefined;
  isHazmat?: boolean | undefined;
  hazmatClass?: string | undefined;
}

export interface ContainerProps {
  id: string;
  orgId: string;
  containerNumber: string;
  type: ContainerType;
  size: ContainerSize;
  status: ContainerStatus;
  currentLocationId?: string | undefined;
  currentLocationType?: string | undefined;
  shipmentId?: string | undefined;
  vesselId?: string | undefined;
  sealNumber?: string | undefined;
  isHazmat: boolean;
  hazmatClass?: string | undefined;
  createdAt: Date;
  updatedAt: Date;
}
