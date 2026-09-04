import { ulid } from 'ulid'

/**
 * Generate a new ULID
 * Used as primary key for all database records
 */
export function generateId(): string {
  return ulid()
}
