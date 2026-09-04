// See https://svelte.dev/docs/kit/types#app.d.ts
import type { UserSession } from '@/core/session'

declare global {
  namespace App {
    interface Locals {
      user: UserSession | null
    }
    interface PageData {}
    interface PageState {}
    interface Platform {}
    interface Error {
      message: string
      code?: string
    }
  }
}

export {}
