import { readFileSync } from 'fs'
import path from 'path'
import postgres from 'postgres'
import { env } from '@/shared/config/env'
import { logger } from '@/shared/logging'

// Apply analytics materialized views.
// Must run OUTSIDE a transaction: CREATE MATERIALIZED VIEW and
// REFRESH ... CONCURRENTLY are not allowed inside a transaction block, so this
// uses a plain (autocommit) client, not the Drizzle migrator.
const client = postgres(env.DATABASE_URL, { max: 1 })

async function applyViews(): Promise<void> {
  const sqlFile = path.join(import.meta.dir, 'analytics-views.sql')
  const sql = readFileSync(sqlFile, 'utf-8')
  logger.info('Applying analytics materialized views...')
  await client.unsafe(sql)
  logger.info('Analytics views applied')
}

applyViews()
  .catch(err => {
    logger.error('Analytics views failed', { error: String(err) })
    process.exit(1)
  })
  .finally(async () => {
    await client.end()
  })