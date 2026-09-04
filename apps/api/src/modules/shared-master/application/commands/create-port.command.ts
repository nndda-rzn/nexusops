import { ports } from '@/shared/database/schema/shared-master'
import { generateId } from '@/shared/ids'
import type { DbContext } from '@/shared/database/client'

export interface CreatePortCommand {
  code: string
  name: string
  country: string
  city: string
  type: 'SEA' | 'RIVER' | 'INLAND'
  location?: string | undefined  // WKT e.g. "POINT(106.827 -6.175)"
}

export async function createPortCommand(
  cmd: CreatePortCommand,
  db: DbContext
): Promise<{ id: string; code: string }> {
  const id = generateId()
  await db.insert(ports).values({
    id,
    code: cmd.code,
    name: cmd.name,
    country: cmd.country,
    city: cmd.city,
    type: cmd.type,
    ...(cmd.location ? { location: cmd.location } : {}),
  })
  return { id, code: cmd.code }
}
