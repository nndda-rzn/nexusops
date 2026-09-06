import { DomainNotFoundError, DomainError } from '@/shared/errors'

export class GeofenceNotFoundError extends DomainNotFoundError {
  constructor(id: string) {
    super('geofence-not-found', 'Geofence Not Found', `Geofence '${id}' does not exist.`, { geofence_id: id })
  }
}

export class GeofenceConflictError extends DomainError {
  constructor(detail: string, extensions?: Record<string, unknown>) {
    super('geofence-conflict', 'Geofence Conflict', detail, extensions)
  }
}