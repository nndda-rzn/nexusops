import {
  VALID_CONTAINER_TRANSITIONS,
  type ContainerStatus,
  type ContainerType,
  type ContainerSize,
  type CreateContainerProps,
  type ContainerProps,
} from './container.types'
import { InvalidContainerTransitionError, ContainerAlreadyGateOutError } from '../errors/container.errors'

export type {
  ContainerStatus, ContainerType, ContainerSize,
  CreateContainerProps, ContainerProps,
} from './container.types'

export type { HoldType, MovementType } from './container.types'

export {
  CONTAINER_STATUSES, CONTAINER_TYPES, CONTAINER_SIZES, MOVEMENT_TYPES, HOLD_TYPES,
  VALID_CONTAINER_TRANSITIONS,
} from './container.types'

// ISO 6346 container number validation (basic)
export function isValidContainerNumber(number: string): boolean {
  return /^[A-Z]{4}\d{7}$/.test(number.toUpperCase().replace(/\s/g, ''))
}

export class Container {
  readonly id: string
  readonly orgId: string
  readonly containerNumber: string
  readonly type: ContainerType
  readonly size: ContainerSize
  private _status: ContainerStatus
  private _currentLocationId?: string | undefined
  private _currentLocationType?: string | undefined
  readonly shipmentId?: string | undefined
  readonly vesselId?: string | undefined
  readonly sealNumber?: string | undefined
  readonly isHazmat: boolean
  readonly hazmatClass?: string | undefined
  readonly createdAt: Date
  private _updatedAt: Date

  private constructor(props: ContainerProps) {
    this.id = props.id
    this.orgId = props.orgId
    this.containerNumber = props.containerNumber
    this.type = props.type
    this.size = props.size
    this._status = props.status
    this._currentLocationId = props.currentLocationId
    this._currentLocationType = props.currentLocationType
    this.shipmentId = props.shipmentId
    this.vesselId = props.vesselId
    this.sealNumber = props.sealNumber
    this.isHazmat = props.isHazmat
    this.hazmatClass = props.hazmatClass
    this.createdAt = props.createdAt
    this._updatedAt = props.updatedAt
  }

  get status(): ContainerStatus { return this._status }
  get currentLocationId(): string | undefined { return this._currentLocationId }
  get currentLocationType(): string | undefined { return this._currentLocationType }
  get updatedAt(): Date { return this._updatedAt }

  static create(id: string, props: CreateContainerProps): Container {
    return new Container({
      id, orgId: props.orgId,
      containerNumber: props.containerNumber.toUpperCase(),
      type: props.type, size: props.size,
      status: 'ANNOUNCED',
      shipmentId: props.shipmentId, vesselId: props.vesselId,
      sealNumber: props.sealNumber,
      isHazmat: props.isHazmat ?? false, hazmatClass: props.hazmatClass,
      createdAt: new Date(), updatedAt: new Date(),
    })
  }

  static reconstitute(props: ContainerProps): Container {
    return new Container(props)
  }

  move(toLocationType: string, toLocationId: string): void {
    this._currentLocationType = toLocationType
    this._currentLocationId = toLocationId
    this._updatedAt = new Date()
  }

  transitionTo(newStatus: ContainerStatus): void {
    if (this._status === 'GATE_OUT') throw new ContainerAlreadyGateOutError(this.id)
    const allowed = VALID_CONTAINER_TRANSITIONS[this._status]
    if (!allowed.includes(newStatus)) {
      throw new InvalidContainerTransitionError(this._status, newStatus)
    }
    this._status = newStatus
    this._updatedAt = new Date()
  }
}
