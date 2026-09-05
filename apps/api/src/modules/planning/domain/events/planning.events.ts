export interface OptimizationRequestedEvent {
  type: 'planning.optimization_requested'
  jobId: string
  orgId: string
  jobType: string
  requestedBy: string
  occurredAt: Date
}
export interface OptimizationJobStatusChangedEvent {
  type: 'planning.optimization_job_status_changed'
  jobId: string
  orgId: string
  from: string | undefined
  to: string
  message?: string | undefined
  occurredAt: Date
  actorId?: string | undefined
}