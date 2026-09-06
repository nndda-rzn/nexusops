import { describe, expect, test } from 'bun:test'
import { refreshAnalyticsCommand } from '@/modules/analytics/application/commands/refresh-analytics.command'

describe('refreshAnalyticsCommand', () => {
  test('refreshes both KPI materialized views', async () => {
    const statements: unknown[] = []
    const db = {
      execute: async (statement: unknown) => {
        statements.push(statement)
      },
    }

    await refreshAnalyticsCommand(db as never)

    expect(statements).toHaveLength(2)
    const firstQuery = (statements[0] as { queryChunks: [{ value: string[] }] }).queryChunks[0].value.join('')
    const secondQuery = (statements[1] as { queryChunks: [{ value: string[] }] }).queryChunks[0].value.join('')
    expect(firstQuery).toContain('road_trip_kpis_daily')
    expect(secondQuery).toContain('maritime_port_call_kpis_daily')
  })
})
