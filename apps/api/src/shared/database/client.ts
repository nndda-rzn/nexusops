import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { sql } from 'drizzle-orm'
import { env } from '@/shared/config/env'
import { logger } from '@/shared/logging'

// ─────────────────────────────────────────
// Connection pools
// ─────────────────────────────────────────

// Query pool — used for all application queries
const queryClient = postgres(env.DATABASE_URL, {
  max: env.DATABASE_POOL_MAX,
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => {},
})

// Migration pool — single connection for migrations
const migrationClient = postgres(env.DATABASE_URL, { max: 1 })

export const db = drizzle(queryClient)
export const migrationDb = drizzle(migrationClient)

// ─────────────────────────────────────────
// withRequestContext
// ─────────────────────────────────────────
// SAFE pattern for RLS: acquires a dedicated connection from the pool,
// sets PostgreSQL session variables within a transaction, runs the callback,
// then releases the connection. This prevents context leaking between requests.
//
// Usage:
//   const result = await withRequestContext(
//     { orgId, entityType, holdingId },
//     async (ctx) => {
//       return ctx.select().from(vessels).where(...)
//     }
//   )
// ─────────────────────────────────────────

export interface RequestContext {
  orgId: string
  entityType: string
  holdingId: string
  interventionMode?: boolean
}

export async function withRequestContext<T>(
  context: RequestContext,
  fn: (db: ReturnType<typeof drizzle>) => Promise<T>
): Promise<T> {
  // Reserve a single connection from the pool for this request
  const reservedClient = await queryClient.reserve()

  try {
    const reservedDb = drizzle(reservedClient)

    // Set RLS context variables — local=true means transaction-scoped
    await reservedDb.execute(sql`
      SELECT
        set_config('app.current_org_id', ${context.orgId}, true),
        set_config('app.entity_type', ${context.entityType}, true),
        set_config('app.holding_id', ${context.holdingId}, true),
        set_config('app.intervention_mode', ${context.interventionMode ? 'true' : 'false'}, true)
    `)

    return await fn(reservedDb)
  } finally {
    // Always release the connection back to the pool
    await reservedClient.release()
  }
}

// ─────────────────────────────────────────
// Convenience: get a db instance with context already set
// For use in ElysiaJS middleware — reserves connection for request lifetime
// ─────────────────────────────────────────

export async function closeDatabase(): Promise<void> {
  await queryClient.end()
  logger.info('Database connection closed')
}
