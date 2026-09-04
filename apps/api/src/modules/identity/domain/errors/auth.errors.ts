import { DomainError, DomainNotFoundError } from '@/shared/errors'

export class InvalidCredentialsError extends DomainError {
  constructor() {
    super('invalid-credentials', 'Invalid Credentials',
      'Email or password is incorrect.')
  }
}

export class UserSuspendedError extends DomainError {
  constructor() {
    super('user-suspended', 'Account Suspended',
      'Your account has been suspended. Please contact support.')
  }
}

export class OrgSuspendedError extends DomainError {
  constructor() {
    super('org-suspended', 'Organization Suspended',
      'Your organization has been suspended. Please contact support.')
  }
}

export class InvalidRefreshTokenError extends DomainError {
  constructor() {
    super('invalid-refresh-token', 'Invalid Refresh Token',
      'Refresh token is invalid or expired.')
  }
}

// L-01 FIX: 404 not 409
export class EntityNotFoundError extends DomainNotFoundError {
  constructor(entityId: string) {
    super('entity-not-found', 'Entity Not Found',
      `Entity '${entityId}' not found or access denied.`,
      { entity_id: entityId })
  }
}
