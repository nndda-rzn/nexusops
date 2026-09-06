import { sql } from 'drizzle-orm'
import { ValidationError } from '@/shared/errors'
import type { DbContext } from '@/shared/database/client'

export type AnalyticsDomain = 'road' | 'maritime'

function parseDateParam(value: string | undefined, field: string): Date | undefined {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`Invalid analytics date parameter: ${field}.`, { [field]: value })
  }
  return date
}

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

  const from = parseDateParam(params?.from, 'from')
  const to = parseDateParam(params?.to, 'to')
  if (from && to && from >= to) {
    throw new ValidationError('Analytics date range must have from before to.', {
      from: params?.from ?? '', to: params?.to ?? '',
    })
  }

  const rows = await db.execute(sql`
    SELECT ${columns}
    FROM ${table}
    WHERE org_id = ${orgId}
      ${from ? sql`AND day >= ${from}` : sql``}
      ${to ? sql`AND day < ${to}` : sql``}
    ORDER BY day ASC
  `)

  return rows
}
