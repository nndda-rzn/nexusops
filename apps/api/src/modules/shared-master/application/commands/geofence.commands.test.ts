import { describe, test, expect } from 'bun:test'
import { createGeofenceCommand, assertGeofenceNameAvailable } from '@/modules/shared-master/application/commands/geofence.commands'
import { assertValidWkt } from '@/shared/database/types/geometry'
import { ValidationError } from '@/shared/errors'

// ─────────────────────────────────────────
// assertValidWkt (F-05)
// ─────────────────────────────────────────
describe('assertValidWkt', () => {
  test('accepts valid POINT', () => {
    expect(() => assertValidWkt('POINT', 'POINT(106.85 -6.20)')).not.toThrow()
  })

  test('accepts valid POLYGON', () => {
    expect(() => assertValidWkt('POLYGON', 'POLYGON((106.80 -6.25, 106.90 -6.25, 106.90 -6.15, 106.80 -6.15, 106.80 -6.25))')).not.toThrow()
  })

  test('accepts valid LINESTRING', () => {
    expect(() => assertValidWkt('LINESTRING', 'LINESTRING(106.82 -6.21, 107.10 -6.30)')).not.toThrow()
  })

  test('rejects garbage for POLYGON', () => {
    expect(() => assertValidWkt('POLYGON', 'NOT-A-POLYGON')).toThrow(ValidationError)
  })

  test('rejects POINT with missing coordinate', () => {
    expect(() => assertValidWkt('POINT', 'POINT(106.85)')).toThrow(ValidationError)
  })

  test('rejects LINESTRING with single point', () => {
    expect(() => assertValidWkt('LINESTRING', 'LINESTRING(106.82 -6.21)')).toThrow(ValidationError)
  })

  test('rejects empty string', () => {
    expect(() => assertValidWkt('POLYGON', '')).toThrow(ValidationError)
  })
})

// ─────────────────────────────────────────
// createGeofenceCommand — inserts WKT boundary
// ─────────────────────────────────────────
function makeDb(overrides: Record<string, unknown> = {}) {
  return {
    insert: () => ({
      values: async () => undefined,
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    }),
    ...overrides,
  }
}

describe('createGeofenceCommand', () => {
  test('inserts with ACTIVE status and timestamps', async () => {
    const captured: { value?: Record<string, unknown> } = {}
    const db = {
      insert: () => ({
        values: async (v: Record<string, unknown>) => { captured.value = v },
      }),
    }
    const result = await createGeofenceCommand({
      name: 'Zone A',
      geofenceType: 'WAREHOUSE',
      boundary: 'POLYGON((1 1, 2 1, 2 2, 1 2, 1 1))',
    }, db as unknown as Parameters<typeof createGeofenceCommand>[1])

    expect(result.id).toBeTruthy()
    expect(result.name).toBe('Zone A')
    expect(captured.value?.status).toBe('ACTIVE')
    expect(captured.value?.geofenceType).toBe('WAREHOUSE')
  })

  test('rejects invalid boundary before insert', async () => {
    const db = makeDb()
    await expect(createGeofenceCommand({
      name: 'Bad',
      geofenceType: 'CUSTOM',
      boundary: 'garbage',
    }, db as never)).rejects.toThrow(ValidationError)
  })
})

// ─────────────────────────────────────────
// assertGeofenceNameAvailable — duplicate guard
// ─────────────────────────────────────────
describe('assertGeofenceNameAvailable', () => {
  test('throws conflict when name exists', async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ id: 'gf-1' }],
          }),
        }),
      }),
    }
    await expect(assertGeofenceNameAvailable('Zone A', db as never)).rejects.toThrow(/already exists/)
  })

  test('allows same name when excluding same id (update)', async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ id: 'gf-1' }],
          }),
        }),
      }),
    }
    await expect(assertGeofenceNameAvailable('Zone A', db as never, 'gf-1')).resolves.toBeUndefined()
  })

  test('allows when no existing row', async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [],
          }),
        }),
      }),
    }
    await expect(assertGeofenceNameAvailable('New Zone', db as never)).resolves.toBeUndefined()
  })
})