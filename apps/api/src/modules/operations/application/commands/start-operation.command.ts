import {
  findOperationByIdOrFail,
  saveOperation,
  appendOperationEvent,
} from '@/modules/operations/infrastructure/repositories/operation.repository'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'
import type { OperationStartedEvent } from '@/modules/operations/domain/events/operation.events'

export interface StartOperationCommand {
  operationId: string
  actorId: string
}

export async function startOperationCommand(
  cmd: StartOperationCommand,
  db: DbContext
): Promise<void> {
  const operation = await findOperationByIdOrFail(cmd.operationId, db)

  operation.start()
  await saveOperation(operation, db)

  const event: OperationStartedEvent = {
    type: 'operation.started',
    operationId: operation.id,
    orgId: operation.orgId,
    operationType: operation.type,
    actualStart: operation.actualStart!,
    occurredAt: new Date(),
    actorId: cmd.actorId,
  }

  await appendOperationEvent(event, cmd.actorId, db)
  await eventBus.emit('operation.started', event)
}
