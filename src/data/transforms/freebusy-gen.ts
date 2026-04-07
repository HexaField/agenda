export interface FreeBusySlot {
  startDate: string
  endDate: string
  busyType: 'free' | 'busy' | 'tentative'
}

/**
 * Project events to free/busy slots.
 * Pure function — no AD4M dependency.
 */
export function eventsToFreeBusy(
  events: Array<{ startDate: string; endDate: string; status: string; visibility: string }>
): FreeBusySlot[] {
  return events.map((e) => ({
    startDate: e.startDate,
    endDate: e.endDate,
    busyType:
      e.status === 'EventCancelled'
        ? ('free' as const)
        : e.status === 'EventPostponed'
          ? ('tentative' as const)
          : ('busy' as const)
  }))
}
