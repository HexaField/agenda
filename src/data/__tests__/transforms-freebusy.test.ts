import { describe, it, expect } from 'vitest'
import { eventsToFreeBusy } from '../transforms/freebusy-gen'

describe('eventsToFreeBusy', () => {
  it('FBT-01: maps active events to busy slots', () => {
    const result = eventsToFreeBusy([
      {
        startDate: '2025-06-01T09:00:00Z',
        endDate: '2025-06-01T10:00:00Z',
        status: 'EventScheduled',
        visibility: 'public'
      }
    ])
    expect(result[0].busyType).toBe('busy')
  })

  it('FBT-02: maps cancelled events to free', () => {
    const result = eventsToFreeBusy([
      {
        startDate: '2025-06-01T09:00:00Z',
        endDate: '2025-06-01T10:00:00Z',
        status: 'EventCancelled',
        visibility: 'public'
      }
    ])
    expect(result[0].busyType).toBe('free')
  })

  it('FBT-03: maps postponed events to tentative', () => {
    const result = eventsToFreeBusy([
      {
        startDate: '2025-06-01T09:00:00Z',
        endDate: '2025-06-01T10:00:00Z',
        status: 'EventPostponed',
        visibility: 'public'
      }
    ])
    expect(result[0].busyType).toBe('tentative')
  })

  it('FBT-04: preserves start/end times', () => {
    const result = eventsToFreeBusy([
      {
        startDate: '2025-06-01T09:00:00Z',
        endDate: '2025-06-01T10:00:00Z',
        status: 'EventScheduled',
        visibility: 'public'
      }
    ])
    expect(result[0].startDate).toBe('2025-06-01T09:00:00Z')
    expect(result[0].endDate).toBe('2025-06-01T10:00:00Z')
  })

  it('FBT-05: empty input returns empty', () => {
    expect(eventsToFreeBusy([])).toEqual([])
  })
})
