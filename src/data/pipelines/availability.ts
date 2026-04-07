import type { PerspectiveProxy } from '@coasys/ad4m'
import { AgendaEvent } from '../models/event'
import { FreeBusy as FreeBusyModel } from '../models/freebusy'
import { eventsToFreeBusy } from '../transforms/freebusy-gen'

/**
 * Pipeline: events → free/busy slots → publish as FreeBusy instances
 */
export async function publishAvailability(
  perspective: PerspectiveProxy,
  ownerDid: string,
  windowStart: Date,
  windowEnd: Date
): Promise<void> {
  const events = (await AgendaEvent.query(perspective).get()) as AgendaEvent[]

  const inRange = events.filter((e) => {
    const start = new Date(e.startDate)
    const end = new Date(e.endDate)
    return start <= windowEnd && end >= windowStart
  })

  const slots = eventsToFreeBusy(
    inRange.map((e) => ({
      startDate: e.startDate,
      endDate: e.endDate,
      status: e.status,
      visibility: e.visibility
    }))
  )

  for (const slot of slots) {
    await FreeBusyModel.create(perspective, {
      startDate: slot.startDate,
      endDate: slot.endDate,
      busyType: slot.busyType,
      owner: ownerDid
    })
  }
}
