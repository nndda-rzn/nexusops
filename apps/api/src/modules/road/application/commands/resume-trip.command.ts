import { findTripByIdOrFail, saveTrip } from '@/modules/road/infrastructure/repositories/trip.repository'
import type { DbContext } from '@/shared/database/client'

export interface ResumeTripCommand {
  tripId: string
  orgId: string
}

export async function resumeTripCommand(
  cmd: ResumeTripCommand,
  db: DbContext
): Promise<void> {
  const trip = await findTripByIdOrFail(cmd.tripId, cmd.orgId, db)
  // AT_CHECKPOINT → EN_ROUTE — allows multiple checkpoints per trip
  trip.transition('EN_ROUTE')
  await saveTrip(trip, db)
}
