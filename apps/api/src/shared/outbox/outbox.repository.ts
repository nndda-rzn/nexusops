import { outboxEvents } from '@/shared/database/schema/outbox'
import { generateId } from '@/shared/ids'
import type { DbContext } from '@/shared/database/client'

export interface AppendOutboxCommand {
  orgId: string
  eventType: string
  aggregateType: string
  aggregateId: string
  payload: unknown
}

// Transactional outbox — called inside the SAME transaction as the business write.
// PostgreSQL is source of truth; a background publisher forwards to Redis Streams.
export async function appendOutboxEvent(cmd: AppendOutboxCommand, db: DbContext): Promise<void> {
  await db.insert(outboxEvents).values({
    id: generateId(), orgId: cmd.orgId,
    eventType: cmd.eventType,
    aggregateType: cmd.aggregateType,
    aggregateId: cmd.aggregateId,
    payload: cmd.payload,
    status: 'PENDING',
    retryCount: 0,
    createdAt: new Date(),
  })
}