import type { FreeBusySlot } from './freebusy-gen'

export interface FreeSlot {
  startDate: string
  endDate: string
}

/**
 * Find mutual free slots across multiple FreeBusy sets.
 * Pure function.
 */
export function findMutualFreeSlots(
  freeBusySets: FreeBusySlot[][],
  windowStart: Date,
  windowEnd: Date,
  minDurationMs: number
): FreeSlot[] {
  // Merge all busy periods
  const allBusy = freeBusySets
    .flat()
    .filter((s) => s.busyType !== 'free')
    .map((s) => ({ start: new Date(s.startDate).getTime(), end: new Date(s.endDate).getTime() }))
    .sort((a, b) => a.start - b.start)

  // Merge overlapping busy periods
  const merged: Array<{ start: number; end: number }> = []
  for (const period of allBusy) {
    const last = merged[merged.length - 1]
    if (last && period.start <= last.end) {
      last.end = Math.max(last.end, period.end)
    } else {
      merged.push({ ...period })
    }
  }

  // Find gaps
  const slots: FreeSlot[] = []
  let cursor = windowStart.getTime()

  for (const busy of merged) {
    if (busy.start > cursor && busy.start - cursor >= minDurationMs) {
      slots.push({
        startDate: new Date(cursor).toISOString(),
        endDate: new Date(busy.start).toISOString()
      })
    }
    cursor = Math.max(cursor, busy.end)
  }

  const windowEndMs = windowEnd.getTime()
  if (windowEndMs > cursor && windowEndMs - cursor >= minDurationMs) {
    slots.push({
      startDate: new Date(cursor).toISOString(),
      endDate: new Date(windowEndMs).toISOString()
    })
  }

  return slots
}
