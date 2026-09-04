import postgres from 'postgres'
import { env } from '@/shared/config/env'
import { logger } from '@/shared/logging'

/**
 * Reset database — drops all schemas and recreates them
 * DEV ONLY — never run in production
 */
async function reset() {
  if (env.APP_ENV === 'production') {
    logger.error('db:reset is not allowed in production')
    process.exit(1)
  }

  const client = postgres(env.DATABASE_URL, { max: 1 })

  try {
    logger.info('Resetting database...')

    const schemas = [
      'identity', 'operations', 'shipments', 'containers',
      'maritime', 'rail', 'road', 'aviation', 'terminal',
      'yard', 'warehouse', 'assets', 'maintenance', 'workforce',
      'planning', 'billing', 'analytics', 'intermodal', 'group',
      'shared_master', 'shared', 'audit',
    ]

    for (const schema of schemas) {
      await client.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
      await client.unsafe(`CREATE SCHEMA "${schema}"`)
      logger.info(`Schema reset: ${schema}`)
    }

    // Also clear drizzle migrations table
    await client.unsafe(`DROP TABLE IF EXISTS "drizzle"."__drizzle_migrations" CASCADE`)

    logger.info('Database reset complete. Run db:migrate to re-apply migrations.')
  } catch (error) {
    logger.error('Reset failed', { error: String(error) })
    process.exit(1)
  } finally {
    await client.end()
  }
}

reset()
