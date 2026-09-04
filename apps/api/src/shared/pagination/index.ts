// ─────────────────────────────────────────
// Pagination helpers
// ─────────────────────────────────────────

export interface PaginationParams {
  page?: number | undefined
  limit?: number | undefined
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: PaginationMeta
}

export const DEFAULT_PAGE = 1
export const DEFAULT_LIMIT = 20
export const MAX_LIMIT = 100

/**
 * Normalize pagination params with defaults and bounds
 */
export function normalizePagination(params: PaginationParams): { page: number; limit: number } {
  const page = Math.max(1, params.page ?? DEFAULT_PAGE)
  const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit ?? DEFAULT_LIMIT))
  return { page, limit }
}

/**
 * Calculate offset from page and limit
 */
export function toOffset(page: number, limit: number): number {
  return (page - 1) * limit
}

/**
 * Build pagination meta from total count
 */
export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const total_pages = Math.ceil(total / limit)
  return {
    page,
    limit,
    total,
    total_pages,
    has_next: page < total_pages,
    has_prev: page > 1,
  }
}

/**
 * Build a paginated result
 */
export function paginate<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResult<T> {
  return {
    data,
    pagination: buildPaginationMeta(page, limit, total),
  }
}
