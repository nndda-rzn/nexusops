import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import type { PostgresJsDatabase, PostgresJsTransaction } from 'drizzle-orm/postgres-js'
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

// Base db instance — used for auth/identity commands (no RLS needed)
export const db = drizzle(queryClient)
export const migrationDb = drizzle(migrationClient)

// ─────────────────────────────────────────
// DbContext — type for dependency injection
//
// Domain commands/queries MUST receive this type as a parameter.
// Never import { db } directly in domain code (Phase 1+).
//
// Exception — these CAN import { db } directly (no RLS needed):
//   - Auth commands (login, refresh-token, switch-entity) — pre-auth
//   - Identity admin commands — Holding-gated + explicit filters
//   - Dev utilities (seed.ts, reset.ts, migrate.ts)
// ─────────────────────────────────────────

// DbContext covers both the top-level db instance and the transaction object
// passed inside .transaction() callbacks — both are valid injection targets.
export type DbContext =
  | PostgresJsDatabase<Record<string, never>>
  | PostgresJsTransaction<Record<string, never>, Record<string, never>>

// ─────────────────────────────────────────
// withRequestContext — R-01 FIX
// ─────────────────────────────────────────
// Wraps ALL operations in an explicit PostgreSQL transaction so that
// set_config(..., is_local=true) is truly transaction-scoped.
//
// WITHOUT explicit transaction: set_config with is_local=true behaves
// identically to is_local=false (session-scoped) because the implicit
// autocommit transaction ends immediately after the SELECT statement.
// This means RLS context leaks to subsequent requests on the same connection.
//
// WITH explicit transaction (BEGIN...COMMIT): set_config with is_local=true
// is reset to the previous value when the transaction ends (COMMIT/ROLLBACK),
// ensuring the connection returned to the pool has no RLS context.
//
// Reference: PostgreSQL 16 docs — set_config(setting_name, new_value, is_local)
// "If is_local is true, the new value will only apply during the current transaction."
// ─────────────────────────────────────────

export interface RequestContext {
  orgId: string
  entityType: string
  holdingId: string
  interventionMode?: boolean | undefined
}

export async function withRequestContext<T>(
  context: RequestContext,
  fn: (db: DbContext) => Promise<T>
): Promise<T> {
  const reservedClient = await queryClient.reserve()

  try {
    const reservedDb = drizzle(reservedClient)

    // R-01 FIX: wrap in explicit transaction so set_config LOCAL is truly scoped
    return await reservedDb.transaction(async (tx) => {
      // set_config with is_local=true inside BEGIN...COMMIT:
      // values are reset when transaction ends — connection returned to pool is clean
      await tx.execute(sql`
        SELECT
          set_config('app.current_org_id',   ${context.orgId},                                   true),
          set_config('app.entity_type',       ${context.entityType},                              true),
          set_config('app.holding_id',        ${context.holdingId},                               true),
          set_config('app.intervention_mode', ${context.interventionMode ? 'true' : 'false'},     true)
      `)

      return await fn(tx)
    })
  } finally {
    await reservedClient.release()
  }
}

export async function closeDatabase(): Promise<void> {
  await queryClient.end()
  await migrationClient.end()
  logger.info('Database connection closed')
}
