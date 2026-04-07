import { describe, it, expect } from 'vitest'
import { applyDefaults } from '../annotations/defaults'
import { validate } from '../annotations/validation'
import { icsToModelData, modelDataToIcs } from '../annotations/ics-mapping'
import { EVENT_ANNOTATIONS } from '../models/event'
import { FREE_BUSY_ANNOTATIONS } from '../models/freebusy'
import type { ShapeAnnotations } from '../annotations/types'

// ---- defaults ----

describe('applyDefaults', () => {
  it('DF-01: fills missing fields from annotation defaults', () => {
    const result = applyDefaults({}, EVENT_ANNOTATIONS)
    expect(result.status).toBe('EventScheduled')
    expect(result.visibility).toBe('private')
  })

  it('DF-02: does NOT overwrite provided values', () => {
    const result = applyDefaults({ status: 'EventCancelled' }, EVENT_ANNOTATIONS)
    expect(result.status).toBe('EventCancelled')
  })

  it('DF-03: handles empty string as missing', () => {
    const result = applyDefaults({ status: '' }, EVENT_ANNOTATIONS)
    expect(result.status).toBe('EventScheduled')
  })

  it('DF-04: works for any model annotations', () => {
    const result = applyDefaults({}, FREE_BUSY_ANNOTATIONS)
    expect(result.busyType).toBe('busy')
  })
})

// ---- validation ----

describe('validate', () => {
  const metadata = {
    properties: [
      { name: 'name', required: true },
      { name: 'startDate', required: true },
      { name: 'endDate', required: true },
      { name: 'location', required: false }
    ]
  }

  it('VL-01: checks required properties from model metadata', () => {
    const errors = validate({}, EVENT_ANNOTATIONS, metadata)
    expect(errors.some((e) => e.field === 'name')).toBe(true)
  })

  it('VL-02: evaluates comparison rules', () => {
    const errors = validate(
      { name: 'Test', startDate: '2025-01-02T00:00:00', endDate: '2025-01-01T00:00:00' },
      EVENT_ANNOTATIONS,
      metadata
    )
    expect(errors.some((e) => e.field === 'endDate')).toBe(true)
  })

  it('VL-03: returns empty array when valid', () => {
    const errors = validate(
      { name: 'Test', startDate: '2025-01-01T00:00:00', endDate: '2025-01-02T00:00:00' },
      EVENT_ANNOTATIONS,
      metadata
    )
    expect(errors).toEqual([])
  })

  it('VL-04: works for any model metadata + annotations', () => {
    const fbMeta = {
      properties: [
        { name: 'startDate', required: true },
        { name: 'endDate', required: true },
        { name: 'busyType', required: true },
        { name: 'owner', required: true }
      ]
    }
    const errors = validate(
      { startDate: 'a', endDate: 'b', busyType: 'busy', owner: 'did:x' },
      FREE_BUSY_ANNOTATIONS,
      fbMeta
    )
    // endDate 'b' > startDate 'a' by string comparison, so valid
    expect(errors).toEqual([])
  })

  it('VL-05: adding a rule to annotations is enforced without code changes', () => {
    const customAnnotations: ShapeAnnotations = {
      ...EVENT_ANNOTATIONS,
      rules: [
        ...EVENT_ANNOTATIONS.rules,
        { type: 'pattern', field: 'name', pattern: '^[A-Z]', message: 'Must start uppercase' }
      ]
    }
    const errors = validate(
      { name: 'lower', startDate: '2025-01-01', endDate: '2025-01-02' },
      customAnnotations,
      metadata
    )
    expect(errors.some((e) => e.message === 'Must start uppercase')).toBe(true)
  })

  it('VL-06: checks pattern rules when present', () => {
    const ann: ShapeAnnotations = {
      fields: {},
      defaults: {},
      rules: [{ type: 'pattern', field: 'url', pattern: '^https://', message: 'Must be https' }]
    }
    const errors = validate({ url: 'http://bad.com' }, ann, { properties: [] })
    expect(errors.some((e) => e.field === 'url')).toBe(true)
  })

  it('VL-07: returns all errors, not just the first', () => {
    const errors = validate({}, EVENT_ANNOTATIONS, metadata)
    expect(errors.length).toBeGreaterThan(1)
  })
})

// ---- ics-mapping ----

describe('icsToModelData', () => {
  it('IM-01: maps via icsMapping table', () => {
    const result = icsToModelData({ SUMMARY: 'Test', DTSTART: '20250101T100000' }, EVENT_ANNOTATIONS)
    expect(result.name).toBe('Test')
    expect(result.startDate).toBe('20250101T100000')
  })

  it('IM-02: ignores unmapped ICS fields', () => {
    const result = icsToModelData({ SUMMARY: 'Test', 'X-CUSTOM': 'val' }, EVENT_ANNOTATIONS)
    expect(Object.keys(result)).not.toContain('X-CUSTOM')
  })
})

describe('modelDataToIcs', () => {
  it('IM-03: maps via icsMapping table', () => {
    const result = modelDataToIcs({ name: 'Test', startDate: '20250101' }, EVENT_ANNOTATIONS)
    expect(result.SUMMARY).toBe('Test')
    expect(result.DTSTART).toBe('20250101')
  })

  it('IM-04: skips empty/undefined values', () => {
    const result = modelDataToIcs({ name: 'Test', location: '' }, EVENT_ANNOTATIONS)
    expect(result).not.toHaveProperty('LOCATION')
  })

  it('IM-05: round-trip preserves mapped fields', () => {
    const original = { name: 'Meeting', startDate: '20250601T090000', endDate: '20250601T100000' }
    const ics = modelDataToIcs(original, EVENT_ANNOTATIONS)
    const roundTrip = icsToModelData(ics, EVENT_ANNOTATIONS)
    expect(roundTrip.name).toBe(original.name)
    expect(roundTrip.startDate).toBe(original.startDate)
    expect(roundTrip.endDate).toBe(original.endDate)
  })

  it('IM-06: adding a mapping entry is sufficient (no code change)', () => {
    const custom: ShapeAnnotations = {
      ...EVENT_ANNOTATIONS,
      icsMapping: { ...EVENT_ANNOTATIONS.icsMapping, visibility: 'X-VISIBILITY' }
    }
    const result = modelDataToIcs({ visibility: 'public' }, custom)
    expect(result['X-VISIBILITY']).toBe('public')
  })
})
