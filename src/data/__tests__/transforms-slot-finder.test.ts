import { describe, it, expect } from 'vitest'
import { findMutualFreeSlots } from '../transforms/slot-finder'
import type { FreeBusySlot } from '../transforms/freebusy-gen'

const HOUR = 60 * 60 * 1000
const windowStart = new Date('2025-06-01T08:00:00Z')
const windowEnd = new Date('2025-06-01T18:00:00Z')

describe('findMutualFreeSlots', () => {
  it('SF-01: no busy periods returns entire window', () => {
    const result = findMutualFreeSlots([], windowStart, windowEnd, HOUR)
    expect(result.length).toBe(1)
    expect(result[0].startDate).toBe(windowStart.toISOString())
    expect(result[0].endDate).toBe(windowEnd.toISOString())
  })

  it('SF-02: excludes busy periods', () => {
    const busy: FreeBusySlot[] = [
      { startDate: '2025-06-01T10:00:00Z', endDate: '2025-06-01T11:00:00Z', busyType: 'busy' }
    ]
    const result = findMutualFreeSlots([busy], windowStart, windowEnd, HOUR)
    expect(result.length).toBe(2)
  })

  it('SF-03: merges overlapping busy from multiple sets', () => {
    const set1: FreeBusySlot[] = [
      { startDate: '2025-06-01T10:00:00Z', endDate: '2025-06-01T12:00:00Z', busyType: 'busy' }
    ]
    const set2: FreeBusySlot[] = [
      { startDate: '2025-06-01T11:00:00Z', endDate: '2025-06-01T13:00:00Z', busyType: 'busy' }
    ]
    const result = findMutualFreeSlots([set1, set2], windowStart, windowEnd, HOUR)
    // 8-10 free, 10-13 busy, 13-18 free
    expect(result.length).toBe(2)
  })

  it('SF-04: respects minDurationMs', () => {
    const busy: FreeBusySlot[] = [
      { startDate: '2025-06-01T08:30:00Z', endDate: '2025-06-01T17:30:00Z', busyType: 'busy' }
    ]
    // Gap before: 30min, gap after: 30min — both < 1hr min
    const result = findMutualFreeSlots([busy], windowStart, windowEnd, HOUR)
    expect(result.length).toBe(0)
  })

  it('SF-05: fully busy window returns empty', () => {
    const busy: FreeBusySlot[] = [
      { startDate: '2025-06-01T07:00:00Z', endDate: '2025-06-01T19:00:00Z', busyType: 'busy' }
    ]
    const result = findMutualFreeSlots([busy], windowStart, windowEnd, HOUR)
    expect(result.length).toBe(0)
  })

  it('SF-06: handles adjacent non-overlapping busy periods', () => {
    const busy: FreeBusySlot[] = [
      { startDate: '2025-06-01T10:00:00Z', endDate: '2025-06-01T11:00:00Z', busyType: 'busy' },
      { startDate: '2025-06-01T11:00:00Z', endDate: '2025-06-01T12:00:00Z', busyType: 'busy' }
    ]
    const result = findMutualFreeSlots([busy], windowStart, windowEnd, HOUR)
    // 8-10 free, 10-12 busy, 12-18 free
    expect(result.length).toBe(2)
  })
})
