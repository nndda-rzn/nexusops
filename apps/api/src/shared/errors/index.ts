// Base error class
export class AppError extends Error {
  constructor(
    public readonly type: string,
    public readonly title: string,
    public readonly status: number,
    public readonly detail: string,
    public readonly extensions?: Record<string, unknown>
  ) {
    super(detail)
    this.name = this.constructor.name

    // B-01 FIX: Error.captureStackTrace is V8-only (Node.js).
    // Bun uses JavaScriptCore which does not have this API.
    // Guard for cross-runtime compatibility — Bun still populates .stack natively.
    if (typeof (Error as unknown as { captureStackTrace?: unknown }).captureStackTrace === 'function') {
      (Error as unknown as { captureStackTrace: (t: unknown, c: unknown) => void })
        .captureStackTrace(this, this.constructor)
    }
  }
}

// Domain error — business rule violation (409)
export class DomainError extends AppError {
  constructor(
    slug: string,
    title: string,
    detail: string,
    extensions?: Record<string, unknown>
  ) {
    super(`https://nexusops.io/errors/${slug}`, title, 409, detail, extensions)
  }
}

// L-01 FIX: Domain not found error — resource does not exist (404)
export class DomainNotFoundError extends AppError {
  constructor(
    slug: string,
    title: string,
    detail: string,
    extensions?: Record<string, unknown>
  ) {
    super(`https://nexusops.io/errors/${slug}`, title, 404, detail, extensions)
  }
}

// Not found error (404)
export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(
      'https://nexusops.io/errors/resource-not-found',
      'Resource Not Found',
      404,
      `${resource} with id '${id}' not found.`,
      { resource, id }
    )
  }
}

// Validation error (422)
export class ValidationError extends AppError {
  constructor(detail: string, fields?: Record<string, string>) {
    super(
      'https://nexusops.io/errors/validation-failed',
      'Validation Failed',
      422,
      detail,
      fields ? { fields } : undefined
    )
  }
}

// Authentication error (401)
export class UnauthorizedError extends AppError {
  constructor(detail = 'Authentication required.') {
    super('https://nexusops.io/errors/unauthorized', 'Unauthorized', 401, detail)
  }
}

// Authorization error (403)
export class ForbiddenError extends AppError {
  constructor(detail: string, extensions?: Record<string, unknown>) {
    super('https://nexusops.io/errors/forbidden', 'Forbidden', 403, detail, extensions)
  }
}

// Conflict error (409)
export class ConflictError extends AppError {
  constructor(detail: string, extensions?: Record<string, unknown>) {
    super('https://nexusops.io/errors/conflict', 'Conflict', 409, detail, extensions)
  }
}

// Infrastructure error (503)
export class ServiceUnavailableError extends AppError {
  constructor(service: string) {
    super(
      'https://nexusops.io/errors/service-unavailable',
      'Service Unavailable',
      503,
      `Service '${service}' is temporarily unavailable.`,
      { service }
    )
  }
}
