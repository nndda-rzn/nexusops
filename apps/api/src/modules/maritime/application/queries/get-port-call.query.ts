import { portCalls } from '@/shared/database/schema/maritime'
import { eq, and } from 'drizzle-orm'
import { PortCallNotFoundError } from '@/modules/maritime/domain/errors/port-call-not-found.error'
import type { DbContext } from '@/shared/database/client'

export async function getPortCallQuery(id: string, orgId: string, db: DbContext) {
  const [row] = await db.select().from(portCalls)
    .where(and(eq(portCalls.id, id), eq(portCalls.orgId, orgId)))
    .limit(1)
  if (!row) throw new PortCallNotFoundError(id)
  return row
}
