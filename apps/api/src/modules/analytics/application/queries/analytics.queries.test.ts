import { describe, expect, test } from 'bun:test'
import { ValidationError } from '@/shared/errors'
import { listKpisQuery, parseDateParam } from '@/modules/analytics/application/queries/analytics.queries'

describe('parseDateParam', () => {
  test('returns undefined for omitted value', () => {
    expect(parseDateParam(undefined, 'from')).toBeUndefined()
  })

  test('parses valid ISO date', () => {
    expect(parseDateParam('2026-09-01', 'from')).toBeInstanceOf(Date)
  })

  test('rejects invalid date', () => {
    expect(() => parseDateParam('not-a-date', 'from')).toThrow(ValidationError)
  })
})

describe('listKpisQuery', () => {
  test('rejects reversed date range before querying DB', async () => {
    const db = { execute: async () => [] }
    await expect(listKpisQuery('org-1', 'road', db as never, {
      from: '2026-09-10', to: '2026-09-01',
    })).rejects.toThrow(/from before to/)
  })

  test('rejects invalid date before querying DB', async () => {
    let executed = false
    const db = { execute: async () => { executed = true; return [] } }
    await expect(listKpisQuery('org-1', 'maritime', db as never, {
      from: 'invalid',
    })).rejects.toThrow(/Invalid analytics date parameter/)
    expect(executed).toBe(false)
  })
})
