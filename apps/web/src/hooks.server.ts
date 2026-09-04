import type { Handle } from '@sveltejs/kit'
import { redirect } from '@sveltejs/kit'

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/']

export const handle: Handle = async ({ event, resolve }) => {
  const accessToken = event.cookies.get('access_token')
  const path = event.url.pathname

  // Allow public routes
  if (PUBLIC_ROUTES.some(r => path === r || path.startsWith(r + '/'))) {
    // If already authenticated, redirect away from login
    if (accessToken && path === '/login') {
      throw redirect(302, '/dashboard')
    }
    return resolve(event)
  }

  // Protected routes — require access token
  if (!accessToken) {
    throw redirect(302, `/login?redirect=${encodeURIComponent(path)}`)
  }

  return resolve(event)
}
