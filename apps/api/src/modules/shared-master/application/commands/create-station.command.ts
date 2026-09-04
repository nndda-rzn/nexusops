import { stations } from '@/shared/database/schema/shared-master'
import { generateId } from '@/shared/ids'
import type { DbContext } from '@/shared/database/client'

export interface CreateStationCommand {
  code: string
  name: string
  city: string
  type: 'PORT' | 'DRY_PORT' | 'INLAND' | 'JUNCTION' | 'YARD'
  operatorOrgId?: string | undefined
  location?: string | undefined  // WKT
}

export async function createStationCommand(
  cmd: CreateStationCommand,
  db: DbContext
): Promise<{ id: string; code: string }> {
  const id = generateId()
  await db.insert(stations).values({
    id,
    code: cmd.code,
    name: cmd.name,
    city: cmd.city,
    type: cmd.type,
    operatorOrgId: cmd.operatorOrgId,
    ...(cmd.location ? { location: cmd.location } : {}),
  })
  return { id, code: cmd.code }
}
