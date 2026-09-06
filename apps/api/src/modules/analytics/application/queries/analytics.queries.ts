import { sql } from 'drizzle-orm'
import type { DbContext } from '@/shared/database/client'

export type AnalyticsDomain = 'road' | 'maritime'

export async function listKpisQuery(
  orgId: string,
  domain: AnalyticsDomain,
  db: DbContext,
  params?: { from?: string | undefined; to?: string | undefined },
) {
  const table = domain === 'road'
    ? sql.raw('"analytics"."road_trip_kpis_daily"')
    : sql.raw('"analytics"."maritime_port_call_kpis_daily"')

  const columns = domain === 'road'
    ? sql.raw('org_id, day, total_trips, completed_trips, on_time_trips, delayed_trips, avg_delay_minutes')
    : sql.raw('org_id, day, total_calls, avg_turnaround_hours, avg_waiting_hours, departed_calls')

  const rows = await db.execute(sql`
    SELECT ${columns}
    FROM ${table}
    WHERE org_id = ${orgId}
      ${params?.from ? sql`AND day >= ${new Date(params.from)}` : sql``}
      ${params?.to ? sql`AND day < ${new Date(params.to)}` : sql``}
    ORDER BY day ASC
  `)

  return rows
}
