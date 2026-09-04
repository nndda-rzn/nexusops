import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { sql } from 'drizzle-orm'
import { env } from '@/shared/config/env'
import { logger } from '@/shared/logging'

// ─────────────────────────────────────────
// Connection pools
// ─────────────────────────────────────────

const queryClient = postgres(env.DATABASE_URL, {
  max: env.DATABASE_POOL_MAX,
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => {},
})

const migrationClient = postgres(env.DATABASE_URL, { max: 1 })

export const db = drizzle(queryClient)
export const migrationDb = drizzle(migrationClient)

// ─────────────────────────────────────────
// DbContext — type for dependency injection
//
// Domain commands/queries MUST receive this type as a parameter.
// Never import { db } directly in domain code (Phase 1+).
//
// Usage pattern:
//   // Route handler:
//   withDbContext(user, async (db) => listVesselsQuery(filter, db))
//
//   // Query handler:
//   export async function listVesselsQuery(filter: Filter, db: DbContext) {
//     return db.select().from(vessels).where(...)
//   }
//
// Exception — these CAN import { db } directly (no RLS needed):
//   - Auth commands (login, refresh-token, switch-entity) — pre-auth
//   - Identity admin commands — Holding-gated + explicit filters
//   - Dev utilities (seed.ts, reset.ts, migrate.ts)
// ─────────────────────────────────────────

export type DbContext = ReturnType<typeof drizzle<Record<string, never>>>

// ─────────────────────────────────────────
// withRequestContext
// ─────────────────────────────────────────
// SAFE pattern for RLS: reserves a dedicated connection, sets PostgreSQL
// session variables, runs the callback, then releases the connection.
// Prevents RLS context leaking between concurrent requests.
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
  const reservedClient = await queryClient.reserve()

  try {
    const reservedDb = drizzle(reservedClient)

    await reservedDb.execute(sql`
      SELECT
        set_config('app.current_org_id', ${context.orgId}, true),
        set_config('app.entity_type', ${context.entityType}, true),
        set_config('app.holding_id', ${context.holdingId}, true),
        set_config('app.intervention_mode', ${context.interventionMode ? 'true' : 'false'}, true)
    `)

    return await fn(reservedDb)
  } finally {
    await reservedClient.release()
  }
}

export async function closeDatabase(): Promise<void> {
  await queryClient.end()
  logger.info('Database connection closed')
}
