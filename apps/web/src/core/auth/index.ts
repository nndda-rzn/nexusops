import { apiClient, setAccessToken, clearAccessToken } from '@/core/api-client'
import { setSession, clearSession } from '@/core/session'

export interface LoginPayload {
  email: string
  password: string
  org_id?: string
}

export interface LoginResponse {
  data: {
    access_token: string
    expires_in: number
    token_type: string
    user: {
      id: string
      name: string
      email: string
    }
    org: {
      id: string
      name: string
      entityType: string
    }
  }
}

export async function login(payload: LoginPayload): Promise<void> {
  const response = await apiClient.post<LoginResponse>('/auth/login', payload)

  const { access_token, user, org } = response.data

  setAccessToken(access_token)

  setSession({
    userId: user.id,
    orgId: org.id,
    entityType: org.entityType,
    role: '',
    permissions: [],
    modules: [],
    holdingId: org.id,
    name: user.name,
    email: user.email,
  }, access_token)
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout', {})
  } catch {
    // ignore errors on logout
  } finally {
    clearAccessToken()
    clearSession()
    window.location.href = '/login'
  }
}

export async function refreshToken(): Promise<boolean> {
  try {
    const response = await apiClient.post<{ data: { access_token: string } }>(
      '/auth/refresh',
      {}
    )
    setAccessToken(response.data.access_token)
    return true
  } catch {
    clearAccessToken()
    clearSession()
    return false
  }
}
