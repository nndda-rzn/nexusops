import { writable, derived } from 'svelte/store'
import { setAccessToken, clearAccessToken } from '@/core/api-client'

export interface UserSession {
  userId: string
  orgId: string
  entityType: string
  role: string
  permissions: string[]
  modules: string[]
  holdingId: string
  name: string
  email: string
}

// Session state
const session = writable<UserSession | null>(null)
const isLoading = writable(false)

// Derived stores
export const currentUser = derived(session, $s => $s)
export const isAuthenticated = derived(session, $s => $s !== null)
export const entityType = derived(session, $s => $s?.entityType ?? null)
export const isHolding = derived(session, $s => $s?.entityType === 'HOLDING')
export const userModules = derived(session, $s => $s?.modules ?? [])
export const userPermissions = derived(session, $s => $s?.permissions ?? [])

export function setSession(user: UserSession, token: string): void {
  setAccessToken(token)
  session.set(user)
}

export function clearSession(): void {
  clearAccessToken()
  session.set(null)
}

export { isLoading }
