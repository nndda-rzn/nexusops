import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { env } from '@/shared/config/env'
import { logger } from '@/shared/logging'
import path from 'path'

const migrationClient = postgres(env.DATABASE_URL, { max: 1 })
const db = drizzle(migrationClient)

async function runMigrations() {
  logger.info('Running database migrations...')

  try {
    await migrate(db, {
      migrationsFolder: path.join(import.meta.dir, 'migrations'),
    })
    logger.info('Migrations completed successfully')
  } catch (error) {
    logger.error('Migration failed', { error: String(error) })
    process.exit(1)
  } finally {
    await migrationClient.end()
  }
}

runMigrations()
