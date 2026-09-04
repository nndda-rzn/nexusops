import {
  VALID_TRANSITIONS,
  type OperationType,
  type OperationStatus,
  type OperationPriority,
  type CreateOperationProps,
  type OperationProps,
} from './operation.types'
import { InvalidOperationTransitionError } from '../errors/operation.errors'

export type {
  OperationType,
  OperationStatus,
  OperationPriority,
  CreateOperationProps,
  OperationProps,
}

export {
  OPERATION_TYPES,
  OPERATION_STATUSES,
  OPERATION_PRIORITIES,
  VALID_TRANSITIONS,
} from './operation.types'

export class Operation {
  readonly id: string
  readonly orgId: string
  readonly type: OperationType
  private _status: OperationStatus
  private _priority: OperationPriority
  readonly referenceId?: string | undefined
  readonly referenceType?: string | undefined
  readonly isCrossEntity: boolean
  readonly relatedEntityIds: string[]
  readonly scheduledStart?: Date | undefined
  readonly scheduledEnd?: Date | undefined
  private _actualStart?: Date | undefined
  private _actualEnd?: Date | undefined
  private _delayMinutes: number
  private _cancelledBy?: string | undefined
  private _cancellationReason?: string | undefined
  readonly createdBy: string
  readonly createdAt: Date
  private _updatedAt: Date

  private constructor(props: OperationProps) {
    this.id = props.id
    this.orgId = props.orgId
    this.type = props.type
    this._status = props.status
    this._priority = props.priority
    this.referenceId = props.referenceId
    this.referenceType = props.referenceType
    this.isCrossEntity = props.isCrossEntity
    this.relatedEntityIds = props.relatedEntityIds
    this.scheduledStart = props.scheduledStart
    this.scheduledEnd = props.scheduledEnd
    this._actualStart = props.actualStart
    this._actualEnd = props.actualEnd
    this._delayMinutes = props.delayMinutes
    this._cancelledBy = props.cancelledBy
    this._cancellationReason = props.cancellationReason
    this.createdBy = props.createdBy
    this.createdAt = props.createdAt
    this._updatedAt = props.updatedAt
  }

  get status(): OperationStatus { return this._status }
  get priority(): OperationPriority { return this._priority }
  get actualStart(): Date | undefined { return this._actualStart }
  get actualEnd(): Date | undefined { return this._actualEnd }
  get delayMinutes(): number { return this._delayMinutes }
  get cancelledBy(): string | undefined { return this._cancelledBy }
  get cancellationReason(): string | undefined { return this._cancellationReason }
  get updatedAt(): Date { return this._updatedAt }

  static create(id: string, props: CreateOperationProps): Operation {
    return new Operation({
      id,
      orgId: props.orgId,
      type: props.type,
      status: 'SCHEDULED',
      priority: props.priority ?? 'NORMAL',
      referenceId: props.referenceId,
      referenceType: props.referenceType,
      isCrossEntity: props.isCrossEntity ?? false,
      relatedEntityIds: props.relatedEntityIds ?? [],
      scheduledStart: props.scheduledStart,
      scheduledEnd: props.scheduledEnd,
      delayMinutes: 0,
      createdBy: props.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static reconstitute(props: OperationProps): Operation {
    return new Operation(props)
  }

  start(): void {
    this.transitionTo('IN_PROGRESS')
    this._actualStart = new Date()
    this._updatedAt = new Date()
  }

  complete(): void {
    this.transitionTo('COMPLETED')
    this._actualEnd = new Date()
    this._updatedAt = new Date()
  }

  cancel(cancelledBy: string, reason: string): void {
    this.transitionTo('CANCELLED')
    this._cancelledBy = cancelledBy
    this._cancellationReason = reason
    this._updatedAt = new Date()
  }

  delay(delayMinutes: number): void {
    if (this._status === 'COMPLETED' || this._status === 'CANCELLED') {
      throw new InvalidOperationTransitionError(this._status, 'DELAYED')
    }
    this._status = 'DELAYED'
    this._delayMinutes += delayMinutes
    this._updatedAt = new Date()
  }

  hold(): void {
    this.transitionTo('ON_HOLD')
    this._updatedAt = new Date()
  }

  resume(): void {
    if (this._status !== 'ON_HOLD') {
      throw new InvalidOperationTransitionError(this._status, 'SCHEDULED')
    }
    this._status = 'SCHEDULED'
    this._updatedAt = new Date()
  }

  reprioritize(priority: OperationPriority): void {
    this._priority = priority
    this._updatedAt = new Date()
  }

  private transitionTo(newStatus: OperationStatus): void {
    const allowed = VALID_TRANSITIONS[this._status]
    if (!allowed.includes(newStatus)) {
      throw new InvalidOperationTransitionError(this._status, newStatus)
    }
    this._status = newStatus
  }
}
