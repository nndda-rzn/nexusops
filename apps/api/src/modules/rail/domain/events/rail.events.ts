import type { TrainStatus } from '../entities/train.entity'

export interface TrainScheduledEvent {
  type: 'train.scheduled'
  trainId: string
  orgId: string
  trainNumber: string
  serviceId: string
  scheduledDeparture: Date
  scheduledArrival: Date
  occurredAt: Date
}

export interface TrainDepartedEvent {
  type: 'train.departed'
  trainId: string
  orgId: string
  trainNumber: string
  actualDeparture: Date
  occurredAt: Date
}

export interface TrainArrivedEvent {
  type: 'train.arrived'
  trainId: string
  orgId: string
  trainNumber: string
  actualArrival: Date
  occurredAt: Date
}

export interface TrainDelayedEvent {
  type: 'train.delayed'
  trainId: string
  orgId: string
  trainNumber: string
  delayMinutes: number
  totalDelayMinutes: number
  occurredAt: Date
}

export interface TrainCancelledEvent {
  type: 'train.cancelled'
  trainId: string
  orgId: string
  trainNumber: string
  reason: string
  occurredAt: Date
}

export type RailEvent =
  | TrainScheduledEvent
  | TrainDepartedEvent
  | TrainArrivedEvent
  | TrainDelayedEvent
  | TrainCancelledEvent

export type TrainStatusChangedPayload = {
  trainId: string
  from: TrainStatus
  to: TrainStatus
}
