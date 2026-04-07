import { Ad4mModel, Model, Property, Optional, ReadOnly, HasMany } from '@coasys/ad4m'
import type { ShapeAnnotations } from '../annotations/types'

@Model({ name: 'MeetingRequest' })
export class MeetingRequest extends Ad4mModel {
  @Property({ through: 'agenda://eventRef', resolveLanguage: 'literal', required: true })
  eventRef: string = ''

  @Property({ through: 'schema://organizer', resolveLanguage: 'literal', required: true })
  organizer: string = ''

  @HasMany({ through: 'schema://attendee' })
  attendees: string[] = []

  @Property({ through: 'agenda://status', resolveLanguage: 'literal', required: true })
  status: string = 'pending'

  @Optional({ through: 'agenda://message', resolveLanguage: 'literal' })
  message: string = ''

  @Optional({ through: 'agenda://proposedTimes', resolveLanguage: 'literal' })
  proposedTimes: string = ''

  @ReadOnly({ through: 'schema://dateCreated' })
  dateCreated: string = ''
}

export const MEETING_REQUEST_ANNOTATIONS: ShapeAnnotations = {
  fields: {
    eventRef: { label: 'Event', inputType: 'hidden', group: 'system', order: -1 },
    organizer: { label: 'From', inputType: 'hidden', group: 'system', order: -1 },
    attendees: { label: 'To', inputType: 'did-list', group: 'primary', order: 0 },
    status: {
      label: 'Status',
      inputType: 'select',
      group: 'primary',
      order: 1,
      options: ['pending', 'accepted', 'declined', 'tentative', 'cancelled']
    },
    message: { label: 'Message', inputType: 'textarea', group: 'details', order: 2 },
    proposedTimes: { label: 'Proposed Times', inputType: 'textarea', group: 'details', order: 3 },
    dateCreated: { label: 'Created', inputType: 'hidden', group: 'system', order: -1 }
  },
  defaults: {
    status: 'pending'
  },
  rules: [],
  icsMapping: {}
}
