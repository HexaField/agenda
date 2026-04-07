import { describe, it, expect } from 'vitest'
import { parseRRule, expandOccurrences } from '../transforms/rrule'

describe('parseRRule', () => {
  it('R-01: parses FREQ=DAILY', () => {
    expect(parseRRule('FREQ=DAILY').freq).toBe('DAILY')
  })

  it('R-02: parses FREQ=WEEKLY with BYDAY', () => {
    const result = parseRRule('FREQ=WEEKLY;BYDAY=MO,WE')
    expect(result.freq).toBe('WEEKLY')
    expect(result.byDay).toEqual(['MO', 'WE'])
  })

  it('R-03: parses FREQ=MONTHLY', () => {
    expect(parseRRule('FREQ=MONTHLY').freq).toBe('MONTHLY')
  })

  it('R-04: parses FREQ=YEARLY', () => {
    expect(parseRRule('FREQ=YEARLY').freq).toBe('YEARLY')
  })

  it('R-05: parses INTERVAL', () => {
    expect(parseRRule('FREQ=DAILY;INTERVAL=2').interval).toBe(2)
  })

  it('R-06: parses COUNT', () => {
    expect(parseRRule('FREQ=DAILY;COUNT=5').count).toBe(5)
  })

  it('R-07: parses UNTIL', () => {
    const result = parseRRule('FREQ=DAILY;UNTIL=20250610T000000Z')
    expect(result.until).toBeInstanceOf(Date)
  })
})

describe('expandOccurrences', () => {
  const baseEvent = {
    startDate: '2025-06-01T09:00:00.000Z',
    endDate: '2025-06-01T10:00:00.000Z',
    recurrence: 'FREQ=DAILY',
    uri: 'test://event-1'
  }

  it('R-08: daily 7-day window → 7 occurrences', () => {
    const result = expandOccurrences(baseEvent, new Date('2025-06-01T00:00:00Z'), new Date('2025-06-07T23:59:59Z'))
    expect(result.length).toBe(7)
  })

  it('R-09: weekly BYDAY=MO,WE 2 weeks → 4 occurrences', () => {
    // 2025-06-02 is Monday
    const event = {
      startDate: '2025-06-02T09:00:00.000Z',
      endDate: '2025-06-02T10:00:00.000Z',
      recurrence: 'FREQ=WEEKLY;BYDAY=MO,WE',
      uri: 'test://event-2'
    }
    const result = expandOccurrences(event, new Date('2025-06-02T00:00:00Z'), new Date('2025-06-15T23:59:59Z'))
    expect(result.length).toBe(4)
  })

  it('R-10: respects COUNT', () => {
    const event = { ...baseEvent, recurrence: 'FREQ=DAILY;COUNT=3' }
    const result = expandOccurrences(event, new Date('2025-06-01T00:00:00Z'), new Date('2025-06-30T23:59:59Z'))
    expect(result.length).toBe(3)
  })

  it('R-11: respects UNTIL', () => {
    const event = { ...baseEvent, recurrence: 'FREQ=DAILY;UNTIL=20250603T235959Z' }
    const result = expandOccurrences(event, new Date('2025-06-01T00:00:00Z'), new Date('2025-06-30T23:59:59Z'))
    expect(result.length).toBe(3)
  })

  it('R-12: does NOT generate outside window', () => {
    const result = expandOccurrences(baseEvent, new Date('2025-06-10T00:00:00Z'), new Date('2025-06-12T23:59:59Z'))
    for (const occ of result) {
      expect(new Date(occ.startDate).getTime()).toBeGreaterThanOrEqual(new Date('2025-06-10T00:00:00Z').getTime())
    }
  })

  it('R-14: handles EXDATE', () => {
    const result = expandOccurrences(baseEvent, new Date('2025-06-01T00:00:00Z'), new Date('2025-06-03T23:59:59Z'), [
      new Date('2025-06-02T09:00:00.000Z')
    ])
    expect(result.length).toBe(2)
  })

  it('R-15: sets parentUri', () => {
    const result = expandOccurrences(baseEvent, new Date('2025-06-01T00:00:00Z'), new Date('2025-06-01T23:59:59Z'))
    expect(result[0].parentUri).toBe('test://event-1')
  })
})
