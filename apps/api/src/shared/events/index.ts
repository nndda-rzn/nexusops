import { logger } from '@/shared/logging'
import type { EventMap } from '@/shared/events/event-map'

export type { EventMap } from '@/shared/events/event-map'
export * from '@/shared/events/event-map'

// ─────────────────────────────────────────
// Typed In-Memory Event Bus
// ─────────────────────────────────────────
// Phase 1-3: in-process EventEmitter
// Phase 4+: upgrade to Redis Pub/Sub without changing subscribers
// ─────────────────────────────────────────

type EventHandler<T = unknown> = (payload: T) => void | Promise<void>

interface Subscription {
  event: string
  handler: EventHandler
}

class InMemoryEventBus {
  private subscriptions: Subscription[] = []

  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): () => void {
    const subscription: Subscription = { event, handler: handler as EventHandler }
    this.subscriptions.push(subscription)
    return () => { this.subscriptions = this.subscriptions.filter(s => s !== subscription) }
  }

  async emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): Promise<void> {
    const handlers = this.subscriptions
      .filter(s => s.event === event || s.event === '*')
      .map(s => s.handler)

    if (handlers.length === 0) return

    await Promise.allSettled(
      handlers.map(async (handler) => {
        try {
          await handler(payload)
        } catch (err) {
          logger.error('Event handler error', {
            event,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      })
    )
  }

  onAll(handler: (payload: unknown) => void | Promise<void>): () => void {
    const subscription: Subscription = { event: '*', handler }
    this.subscriptions.push(subscription)
    return () => { this.subscriptions = this.subscriptions.filter(s => s !== subscription) }
  }

  off(event: string): void {
    this.subscriptions = this.subscriptions.filter(s => s.event !== event)
  }

  clear(): void {
    this.subscriptions = []
  }

  subscriberCount(event: string): number {
    return this.subscriptions.filter(s => s.event === event).length
  }
}

// Singleton instance
export const eventBus = new InMemoryEventBus()

// ─────────────────────────────────────────
// Domain Event envelope
// ─────────────────────────────────────────

export interface DomainEvent<T = unknown> {
  id: string           // event ID (ulid)
  type: string         // e.g. 'vessel.arrived'
  org_id: string       // tenant context
  occurred_at: Date
  payload: T
  metadata: {
    correlation_id?: string
    causation_id?: string
    actor_id?: string
  }
}

export type EventBus = typeof eventBus
