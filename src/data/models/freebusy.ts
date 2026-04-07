import { Ad4mModel, Model, Property, Optional } from '@coasys/ad4m'
import type { ShapeAnnotations } from '../annotations/types'

@Model({ name: 'FreeBusy' })
export class FreeBusy extends Ad4mModel {
  @Property({ through: 'schema://startDate', resolveLanguage: 'literal', required: true })
  startDate: string = ''

  @Property({ through: 'schema://endDate', resolveLanguage: 'literal', required: true })
  endDate: string = ''

  @Property({ through: 'agenda://busyType', resolveLanguage: 'literal', required: true })
  busyType: string = 'busy'

  @Property({ through: 'schema://organizer', resolveLanguage: 'literal', required: true })
  owner: string = ''

  @Optional({ through: 'agenda://calendarId', resolveLanguage: 'literal' })
  calendarId: string = ''
}

export const FREE_BUSY_ANNOTATIONS: ShapeAnnotations = {
  fields: {
    startDate: { label: 'Start', inputType: 'datetime', group: 'primary', order: 0 },
    endDate: { label: 'End', inputType: 'datetime', group: 'primary', order: 1 },
    busyType: {
      label: 'Type',
      inputType: 'select',
      group: 'primary',
      order: 2,
      options: ['free', 'busy', 'tentative']
    },
    owner: { label: 'Owner', inputType: 'hidden', group: 'system', order: -1 },
    calendarId: { label: 'Calendar', inputType: 'hidden', group: 'system', order: -1 }
  },
  defaults: {
    busyType: 'busy'
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
    startDate: 'DTSTART',
    endDate: 'DTEND',
    busyType: 'FBTYPE'
  }
}
