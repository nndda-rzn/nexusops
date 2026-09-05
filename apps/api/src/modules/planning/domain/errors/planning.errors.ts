import { DomainNotFoundError, DomainError } from '@/shared/errors'

export class OptimizationJobNotFoundError extends DomainNotFoundError {
  constructor(id: string) {
    super('optimization-job-not-found', 'Optimization Job Not Found',
      `Optimization job '${id}' does not exist.`, { job_id: id })
  }
}

export class OptimizationJobNotCancellableError extends DomainError {
  constructor(id: string, status: string) {
    super('optimization-job-not-cancellable', 'Optimization Job Not Cancellable',
      `Optimization job '${id}' cannot be cancelled from status '${status}'.`,
      { job_id: id, status })
  }
}

export class OptimizationJobNotRetryableError extends DomainError {
  constructor(id: string, status: string) {
    super('optimization-job-not-retryable', 'Optimization Job Not Retryable',
      `Optimization job '${id}' cannot be retried from status '${status}'.`,
      { job_id: id, status })
  }
}