import { get } from 'svelte/store'
import { userModules, userPermissions } from '@/core/session'

/**
 * Check if current user has access to a module
 */
export function hasModule(module: string): boolean {
  const modules = get(userModules)
  return modules.includes('*') || modules.includes(module)
}

/**
 * Check if current user has a specific permission
 */
export function hasPermission(permission: string): boolean {
  const permissions = get(userPermissions)
  return permissions.includes('*') || permissions.includes(permission)
}

/**
 * Check if current user has all specified permissions
 */
export function hasAllPermissions(perms: string[]): boolean {
  return perms.every(p => hasPermission(p))
}

/**
 * Check if current user has any of specified permissions
 */
export function hasAnyPermission(perms: string[]): boolean {
  return perms.some(p => hasPermission(p))
}
