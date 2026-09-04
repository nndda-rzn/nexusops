import { logger } from '@/shared/logging'

// ─────────────────────────────────────────
// In-Memory Event Bus
// ─────────────────────────────────────────
// Implements a typed publish/subscribe pattern for domain events.
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

  /**
   * Subscribe to a domain event
   */
  on<T>(event: string, handler: EventHandler<T>): () => void {
    const subscription: Subscription = {
      event,
      handler: handler as EventHandler,
    }
    this.subscriptions.push(subscription)

    // Return unsubscribe function
    return () => {
      this.subscriptions = this.subscriptions.filter(s => s !== subscription)
    }
  }

  /**
   * Emit a domain event to all subscribers
   * Errors in individual handlers are logged but do not block other handlers
   */
  async emit<T>(event: string, payload: T): Promise<void> {
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

  /**
   * Subscribe to all events (wildcard)
   */
  onAll(handler: EventHandler<{ event: string; payload: unknown }>): () => void {
    return this.on('*', handler)
  }

  /**
   * Remove all subscriptions for an event
   */
  off(event: string): void {
    this.subscriptions = this.subscriptions.filter(s => s.event !== event)
  }

  /**
   * Clear all subscriptions
   */
  clear(): void {
    this.subscriptions = []
  }

  /**
   * Get subscriber count for an event (useful for testing)
   */
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
