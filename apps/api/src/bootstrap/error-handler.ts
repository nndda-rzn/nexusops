import { Elysia } from 'elysia'
import { AppError } from '@/shared/errors'
import { logger } from '@/shared/logging'
import { ulid } from 'ulid'

// E-02 FIX: handle Elysia-specific error codes before falling through to AppError.
// Elysia 1.4 validation errors have code='VALIDATION' and are NOT instanceof AppError.
// Without this, TypeBox validation failures return 500 instead of 422.
export const errorHandler = new Elysia()
  .onError(({ error, set, request, code }) => {
    const traceId = ulid()
    const pathname = new URL(request.url).pathname

    // Elysia TypeBox validation failure — 422
    if (code === 'VALIDATION') {
      set.status = 422
      logger.warn('Validation error', { status: 422, trace_id: traceId, path: pathname })
      return {
        type: 'https://nexusops.io/errors/validation-failed',
        title: 'Validation Failed',
        status: 422,
        detail: error.message ?? 'Request validation failed.',
        instance: pathname,
        trace_id: traceId,
      }
    }

    // Elysia route not found — 404
    if (code === 'NOT_FOUND') {
      set.status = 404
      return {
        type: 'https://nexusops.io/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: `Route ${pathname} not found.`,
        instance: pathname,
        trace_id: traceId,
      }
    }

    // Elysia body parse failure — 400
    if (code === 'PARSE') {
      set.status = 400
      return {
        type: 'https://nexusops.io/errors/bad-request',
        title: 'Bad Request',
        status: 400,
        detail: 'Request body could not be parsed.',
        instance: pathname,
        trace_id: traceId,
      }
    }

    // Domain AppError (DomainError, NotFoundError, etc.)
    if (error instanceof AppError) {
      logger.warn('Application error', { error_type: error.type, status: error.status, trace_id: traceId })
      set.status = error.status
      return {
        type: error.type, title: error.title, status: error.status,
        detail: error.detail, instance: pathname, trace_id: traceId,
        ...error.extensions,
      }
    }

    // Unhandled fallback — 500
    logger.error('Unhandled error', {
      code,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      trace_id: traceId,
    })
    set.status = 500
    return {
      type: 'https://nexusops.io/errors/internal-server-error',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An unexpected error occurred.',
      instance: pathname,
      trace_id: traceId,
    }
  })
