import { API_BASE_URL } from '@/core/config'

export type ApiResponse<T> = {
  data: T
}

export type PaginatedResponse<T> = {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
    has_next: boolean
    has_prev: boolean
  }
}

export type ApiError = {
  type: string
  title: string
  status: number
  detail: string
  instance: string
  trace_id: string
  [key: string]: unknown
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken()

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    credentials: 'include', // for httpOnly cookie (refresh token)
  })

  if (!response.ok) {
    const error: ApiError = await response.json()
    throw error
  }

  return response.json() as Promise<T>
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('access_token')
}

export function setAccessToken(token: string): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem('access_token', token)
}

export function clearAccessToken(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem('access_token')
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
