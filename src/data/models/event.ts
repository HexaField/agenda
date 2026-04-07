import { Ad4mModel, Model, Property, Optional, ReadOnly, HasMany } from '@coasys/ad4m'
import type { ShapeAnnotations } from '../annotations/types'

@Model({ name: 'AgendaEvent' })
export class AgendaEvent extends Ad4mModel {
  @Property({ through: 'schema://name', resolveLanguage: 'literal', required: true })
  name: string = ''

  @Property({ through: 'schema://startDate', resolveLanguage: 'literal', required: true })
  startDate: string = ''

  @Property({ through: 'schema://endDate', resolveLanguage: 'literal', required: true })
  endDate: string = ''

  @Optional({ through: 'schema://location', resolveLanguage: 'literal' })
  location: string = ''

  @Optional({ through: 'schema://description', resolveLanguage: 'literal' })
  description: string = ''

  @ReadOnly({ through: 'schema://organizer' })
  organizer: string = ''

  @HasMany({ through: 'schema://attendee' })
  attendees: string[] = []

  @Optional({ through: 'schema://eventStatus', resolveLanguage: 'literal' })
  status: string = 'EventScheduled'

  @Optional({ through: 'schema://eventAttendanceMode', resolveLanguage: 'literal' })
  attendanceMode: string = ''

  @Optional({ through: 'schema://url', resolveLanguage: 'literal' })
  url: string = ''

  @Optional({ through: 'agenda://recurrence', resolveLanguage: 'literal' })
  recurrence: string = ''

  @Optional({ through: 'agenda://reminder', resolveLanguage: 'literal' })
  reminder: string = ''

  @Optional({ through: 'agenda://visibility', resolveLanguage: 'literal' })
  visibility: string = 'private'

  @Optional({ through: 'agenda://calendarId', resolveLanguage: 'literal' })
  calendarId: string = ''

  @Optional({ through: 'agenda://icsUid', resolveLanguage: 'literal' })
  icsUid: string = ''
}

export const EVENT_ANNOTATIONS: ShapeAnnotations = {
  fields: {
    name: { label: 'Title', inputType: 'text', group: 'primary', order: 0 },
    startDate: { label: 'Start', inputType: 'datetime', group: 'primary', order: 1 },
    endDate: { label: 'End', inputType: 'datetime', group: 'primary', order: 2 },
    location: { label: 'Location', inputType: 'text', group: 'details', order: 3 },
    description: { label: 'Description', inputType: 'textarea', group: 'details', order: 4 },
    organizer: { label: 'Organizer', inputType: 'hidden', group: 'system', order: -1 },
    attendees: { label: 'Attendees', inputType: 'did-list', group: 'people', order: 5 },
    status: {
      label: 'Status',
      inputType: 'select',
      group: 'details',
      order: 6,
      options: ['EventScheduled', 'EventCancelled', 'EventPostponed', 'EventRescheduled']
    },
    attendanceMode: {
      label: 'Attendance',
      inputType: 'select',
      group: 'details',
      order: 7,
      options: ['OnlineEventAttendanceMode', 'OfflineEventAttendanceMode', 'MixedEventAttendanceMode']
    },
    url: { label: 'URL', inputType: 'url', group: 'details', order: 8 },
    recurrence: { label: 'Repeat', inputType: 'rrule', group: 'details', order: 9 },
    reminder: { label: 'Reminder', inputType: 'duration', group: 'details', order: 10 },
    visibility: {
      label: 'Visibility',
      inputType: 'select',
      group: 'details',
      order: 11,
      options: ['private', 'busy', 'public']
    },
    calendarId: { label: 'Calendar', inputType: 'calendar-select', group: 'primary', order: 12 },
    icsUid: { label: 'ICS UID', inputType: 'hidden', group: 'system', order: -1 }
  },
  defaults: {
    status: 'EventScheduled',
    visibility: 'private'
  },
  rules: [
    {
      type: 'comparison',
      field: 'endDate',
      operator: '>',
      referenceField: 'startDate',
      message: 'End date must be after start date'
    }
  ],
  icsMapping: {
    name: 'SUMMARY',
    startDate: 'DTSTART',
    endDate: 'DTEND',
    location: 'LOCATION',
    description: 'DESCRIPTION',
    organizer: 'ORGANIZER',
    attendees: 'ATTENDEE',
    status: 'STATUS',
    recurrence: 'RRULE',
    icsUid: 'UID',
    reminder: 'VALARM.TRIGGER'
  }
}
