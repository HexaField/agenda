import { describe, it, expect } from 'vitest'
import { importVEvents, exportVEvents } from '../transforms/ics'
import { EVENT_ANNOTATIONS } from '../models/event'

const SAMPLE_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
DTSTART:20250601T090000
DTEND:20250601T100000
SUMMARY:Team Standup
LOCATION:Room 42
DESCRIPTION:Daily sync
UID:test-uid-123@test
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
END:VALARM
END:VEVENT
BEGIN:VEVENT
DTSTART:20250602T140000
DTEND:20250602T150000
SUMMARY:Lunch
UID:test-uid-456@test
END:VEVENT
END:VCALENDAR`

const RRULE_ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:20250601T090000
DTEND:20250601T100000
SUMMARY:Daily
UID:rrule-test@test
RRULE:FREQ=DAILY;COUNT=3
END:VEVENT
END:VCALENDAR`

describe('importVEvents', () => {
  it('I-01: parses valid ICS and returns model data', () => {
    const results = importVEvents(SAMPLE_ICS, EVENT_ANNOTATIONS)
    expect(results.length).toBe(2)
    expect(results[0].name).toBe('Team Standup')
  })

  it('I-02: converts ICS datetime fields', () => {
    const results = importVEvents(SAMPLE_ICS, EVENT_ANNOTATIONS)
    expect(results[0].startDate).toBeTruthy()
    expect(results[0].endDate).toBeTruthy()
  })

  it('I-03: ignores unmapped ICS fields', () => {
    const results = importVEvents(SAMPLE_ICS, EVENT_ANNOTATIONS)
    expect(results[0]).not.toHaveProperty('ACTION')
  })

  it('I-04: handles multiple VEVENTs', () => {
    const results = importVEvents(SAMPLE_ICS, EVENT_ANNOTATIONS)
    expect(results.length).toBe(2)
    expect(results[1].name).toBe('Lunch')
  })

  it('I-08: handles VALARM trigger', () => {
    const results = importVEvents(SAMPLE_ICS, EVENT_ANNOTATIONS)
    expect(results[0].reminder).toBeTruthy()
  })

  it('I-09: handles RRULE', () => {
    const results = importVEvents(RRULE_ICS, EVENT_ANNOTATIONS)
    expect(results[0].recurrence).toContain('DAILY')
  })
})

describe('exportVEvents', () => {
  it('I-05: produces valid iCalendar', () => {
    const ics = exportVEvents(
      [{ name: 'Test', startDate: '20250601T090000', endDate: '20250601T100000' }],
      EVENT_ANNOTATIONS
    )
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('END:VCALENDAR')
  })

  it('I-06: generates UID if absent', () => {
    const ics = exportVEvents(
      [{ name: 'Test', startDate: '20250601T090000', endDate: '20250601T100000' }],
      EVENT_ANNOTATIONS
    )
    expect(ics.toUpperCase()).toContain('UID')
  })

  it('I-07: round-trip preserves core fields', () => {
    const original = [
      { name: 'Round Trip', startDate: '20250601T090000', endDate: '20250601T100000', icsUid: 'rt@test' }
    ]
    const ics = exportVEvents(original, EVENT_ANNOTATIONS)
    const reimported = importVEvents(ics, EVENT_ANNOTATIONS)
    expect(reimported[0].name).toBe('Round Trip')
  })
})
