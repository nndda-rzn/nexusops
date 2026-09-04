import { airports } from '@/shared/database/schema/shared-master'
import { generateId } from '@/shared/ids'
import type { DbContext } from '@/shared/database/client'

export interface CreateAirportCommand {
  iataCode: string
  icaoCode: string
  name: string
  city: string
  country: string
  operatorOrgId?: string | undefined
  location?: string | undefined  // WKT
}

export async function createAirportCommand(
  cmd: CreateAirportCommand,
  db: DbContext
): Promise<{ id: string; iataCode: string }> {
  const id = generateId()
  await db.insert(airports).values({
    id,
    iataCode: cmd.iataCode,
    icaoCode: cmd.icaoCode,
    name: cmd.name,
    city: cmd.city,
    country: cmd.country,
    operatorOrgId: cmd.operatorOrgId,
    ...(cmd.location ? { location: cmd.location } : {}),
  })
  return { id, iataCode: cmd.iataCode }
}
