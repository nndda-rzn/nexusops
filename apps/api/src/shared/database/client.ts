import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { env } from '@/shared/config/env'
import { logger } from '@/shared/logging'

// Connection for queries
const queryClient = postgres(env.DATABASE_URL, {
  max: env.DATABASE_POOL_MAX,
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => {},
})

// Connection for migrations (max 1)
const migrationClient = postgres(env.DATABASE_URL, { max: 1 })

export const db = drizzle(queryClient)
export const migrationDb = drizzle(migrationClient)

/**
 * Set PostgreSQL session context for RLS three-tier visibility
 * Must be called at the start of every request
 */
export async function setRequestContext(params: {
  orgId: string
  entityType: string
  holdingId: string
  interventionMode?: boolean
}): Promise<void> {
  await queryClient`
    SELECT
      set_config('app.current_org_id', ${params.orgId}, true),
      set_config('app.entity_type', ${params.entityType}, true),
      set_config('app.holding_id', ${params.holdingId}, true),
      set_config('app.intervention_mode', ${params.interventionMode ? 'true' : 'false'}, true)
  `
}

export async function closeDatabase(): Promise<void> {
  await queryClient.end()
  logger.info('Database connection closed')
}
