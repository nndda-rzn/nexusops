import { findPortCallByIdOrFail, savePortCall } from '@/modules/maritime/infrastructure/repositories/port-call.repository'
import { pilotAssignments } from '@/shared/database/schema/maritime'
import { generateId } from '@/shared/ids'
import type { DbContext } from '@/shared/database/client'

export interface AssignPilotCommand {
  portCallId: string
  orgId: string
  pilotId?: string | undefined
  type: 'INBOUND' | 'OUTBOUND'
  scheduledAt: Date
}

export async function assignPilotCommand(cmd: AssignPilotCommand, db: DbContext): Promise<{ id: string }> {
  const portCall = await findPortCallByIdOrFail(cmd.portCallId, cmd.orgId, db)
  portCall.transition('PILOTAGE_ASSIGNED')
  await savePortCall(portCall, db)

  const id = generateId()
  await db.insert(pilotAssignments).values({
    id, orgId: cmd.orgId, portCallId: cmd.portCallId,
    pilotId: cmd.pilotId, type: cmd.type,
    scheduledAt: cmd.scheduledAt, status: 'SCHEDULED',
    createdAt: new Date(),
  })

  return { id }
}
