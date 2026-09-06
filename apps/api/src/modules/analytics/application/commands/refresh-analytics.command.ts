import { sql } from 'drizzle-orm'
import type { DbContext } from '@/shared/database/client'

// REFRESH CONCURRENTLY must run outside a transaction. The caller must pass
// the plain db client, never the withDbContext transaction.
export async function refreshAnalyticsCommand(db: DbContext): Promise<void> {
  await db.execute(sql.raw(
    'REFRESH MATERIALIZED VIEW CONCURRENTLY "analytics"."road_trip_kpis_daily"',
  ))
  await db.execute(sql.raw(
    'REFRESH MATERIALIZED VIEW CONCURRENTLY "analytics"."maritime_port_call_kpis_daily"',
  ))
}
