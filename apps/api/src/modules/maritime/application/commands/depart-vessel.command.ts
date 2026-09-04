import { findPortCallByIdOrFail, savePortCall } from '@/modules/maritime/infrastructure/repositories/port-call.repository'
import { voyages } from '@/shared/database/schema/maritime'
import { eq } from 'drizzle-orm'
import { DomainError } from '@/shared/errors'
import { eventBus } from '@/shared/events'
import type { DbContext } from '@/shared/database/client'

export interface DepartVesselCommand {
  portCallId: string
  orgId: string
  atd: Date
}

export async function departVesselCommand(cmd: DepartVesselCommand, db: DbContext): Promise<void> {
  const portCall = await findPortCallByIdOrFail(cmd.portCallId, cmd.orgId, db)

  // Persist UNBERTHING as intermediate state before DEPARTED
  portCall.transition('UNBERTHING')
  await savePortCall(portCall, db)

  portCall.transition('DEPARTED')
  portCall.recordAtd(cmd.atd)
  await savePortCall(portCall, db)

  // Lookup vesselId via voyage
  const [voyage] = await db.select({ vesselId: voyages.vesselId })
    .from(voyages)
    .where(eq(voyages.id, portCall.voyageId))
    .limit(1)

  // P-04 FIX: throw if voyage not found instead of emitting empty vesselId
  if (!voyage) throw new DomainError(
    'voyage-not-found-for-port-call',
    'Voyage Not Found',
    `Cannot find voyage for port call '${cmd.portCallId}'.`,
    { port_call_id: cmd.portCallId }
  )

  await eventBus.emit('vessel.departed', {
    type: 'vessel.departed',
    vesselId: voyage.vesselId,
    orgId: cmd.orgId,
    portCallId: cmd.portCallId, atd: cmd.atd,
    occurredAt: new Date(),
  })
}
