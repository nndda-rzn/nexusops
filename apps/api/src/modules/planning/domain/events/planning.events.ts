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
export interface PlanActivatedEvent {
  type: 'planning.plan_activated'
  planId: string
  orgId: string
  planType: string
  optimizationJobId?: string | undefined
  occurredAt: Date
  activatedBy: string
}
export interface ScenarioSelectedEvent {
  type: 'planning.scenario_selected'
  scenarioId: string
  orgId: string
  planType: string
  occurredAt: Date
  selectedBy: string
}