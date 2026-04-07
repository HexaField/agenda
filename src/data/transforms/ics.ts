import ICAL from 'ical.js'
import { icsToModelData, modelDataToIcs } from '../annotations/ics-mapping'
import type { ShapeAnnotations } from '../annotations/types'

/**
 * Import VEVENT components from an ICS string.
 */
export function importVEvents(icsString: string, annotations: ShapeAnnotations): Record<string, string>[] {
  const jcal = ICAL.parse(icsString)
  const comp = new ICAL.Component(jcal)
  const vevents = comp.getAllSubcomponents('vevent')

  return vevents.map((vevent: ICAL.Component) => {
    const event = new ICAL.Event(vevent)
    const fields: Record<string, string> = {}

    if (event.summary) fields['SUMMARY'] = event.summary
    if (event.startDate) fields['DTSTART'] = event.startDate.toICALString()
    if (event.endDate) fields['DTEND'] = event.endDate.toICALString()
    if (event.location) fields['LOCATION'] = event.location
    if (event.description) fields['DESCRIPTION'] = event.description
    if (event.uid) fields['UID'] = event.uid

    const organizer = vevent.getFirstPropertyValue('organizer')
    if (organizer) fields['ORGANIZER'] = String(organizer)

    const status = vevent.getFirstPropertyValue('status')
    if (status) fields['STATUS'] = String(status)

    const rrule = vevent.getFirstPropertyValue('rrule')
    if (rrule) fields['RRULE'] = rrule.toString()

    const valarm = vevent.getFirstSubcomponent('valarm')
    if (valarm) {
      const trigger = valarm.getFirstPropertyValue('trigger')
      if (trigger) fields['VALARM.TRIGGER'] = trigger.toString()
    }

    return icsToModelData(fields, annotations)
  })
}

/**
 * Export model data to an ICS string.
 */
export function exportVEvents(events: Record<string, unknown>[], annotations: ShapeAnnotations): string {
  const cal = new ICAL.Component(['vcalendar', [], []])
  cal.updatePropertyWithValue('prodid', '-//Agenda//EN')
  cal.updatePropertyWithValue('version', '2.0')

  for (const eventData of events) {
    const icsFields = modelDataToIcs(eventData, annotations)

    if (!icsFields['UID']) {
      icsFields['UID'] = crypto.randomUUID() + '@agenda'
    }

    const vevent = new ICAL.Component('vevent')

    if (icsFields['SUMMARY']) vevent.updatePropertyWithValue('summary', icsFields['SUMMARY'])
    if (icsFields['DTSTART']) {
      const dt = icsFields['DTSTART'].includes('-')
        ? ICAL.Time.fromDateTimeString(icsFields['DTSTART'])
        : ICAL.Time.fromDateTimeString(
            `${icsFields['DTSTART'].slice(0, 4)}-${icsFields['DTSTART'].slice(4, 6)}-${icsFields['DTSTART'].slice(6, 8)}T${icsFields['DTSTART'].slice(9, 11)}:${icsFields['DTSTART'].slice(11, 13)}:${icsFields['DTSTART'].slice(13, 15)}`
          )
      vevent.updatePropertyWithValue('dtstart', dt)
    }
    if (icsFields['DTEND']) {
      const dt = icsFields['DTEND'].includes('-')
        ? ICAL.Time.fromDateTimeString(icsFields['DTEND'])
        : ICAL.Time.fromDateTimeString(
            `${icsFields['DTEND'].slice(0, 4)}-${icsFields['DTEND'].slice(4, 6)}-${icsFields['DTEND'].slice(6, 8)}T${icsFields['DTEND'].slice(9, 11)}:${icsFields['DTEND'].slice(11, 13)}:${icsFields['DTEND'].slice(13, 15)}`
          )
      vevent.updatePropertyWithValue('dtend', dt)
    }
    if (icsFields['LOCATION']) vevent.updatePropertyWithValue('location', icsFields['LOCATION'])
    if (icsFields['DESCRIPTION']) vevent.updatePropertyWithValue('description', icsFields['DESCRIPTION'])
    if (icsFields['UID']) vevent.updatePropertyWithValue('uid', icsFields['UID'])
    if (icsFields['STATUS']) vevent.updatePropertyWithValue('status', icsFields['STATUS'])
    if (icsFields['ORGANIZER']) vevent.updatePropertyWithValue('organizer', icsFields['ORGANIZER'])

    cal.addSubcomponent(vevent)
  }

  return cal.toString()
}
