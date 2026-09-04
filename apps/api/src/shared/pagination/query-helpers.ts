// Q-16: shared helper to parse page/limit from Elysia query string params
// Elysia query params are typed as string — this normalizes them to numbers
export function parsePaginationQuery(query: { page?: string; limit?: string }) {
  return {
    ...(query.page ? { page: Number(query.page) } : {}),
    ...(query.limit ? { limit: Number(query.limit) } : {}),
  }
}

// Q-18: named constant for position query default limit
export const DEFAULT_POSITION_LIMIT = 100
