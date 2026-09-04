import { DomainNotFoundError } from '@/shared/errors'

export class TrainNotFoundError extends DomainNotFoundError {
  constructor(id: string) {
    super('train-not-found', 'Train Not Found', `Train '${id}' does not exist.`, { train_id: id })
  }
}

export class TrainServiceNotFoundError extends DomainNotFoundError {
  constructor(id: string) {
    super('train-service-not-found', 'Train Service Not Found', `Train service '${id}' does not exist.`, { service_id: id })
  }
}

export class TrainsetNotFoundError extends DomainNotFoundError {
  constructor(id: string) {
    super('trainset-not-found', 'Trainset Not Found', `Trainset '${id}' does not exist.`, { trainset_id: id })
  }
}
