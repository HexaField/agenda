import { Ad4mModel, Model, Property, Optional } from '@coasys/ad4m'
import type { ShapeAnnotations } from '../annotations/types'

@Model({ name: 'CalendarMeta' })
export class CalendarMeta extends Ad4mModel {
  @Property({ through: 'schema://name', resolveLanguage: 'literal', required: true })
  name: string = ''

  @Optional({ through: 'agenda://color', resolveLanguage: 'literal' })
  color: string = '#4285f4'

  @Optional({ through: 'schema://description', resolveLanguage: 'literal' })
  description: string = ''

  @Optional({ through: 'agenda://isDefault', resolveLanguage: 'literal' })
  isDefault: string = 'false'

  @Optional({ through: 'agenda://isVisible', resolveLanguage: 'literal' })
  isVisible: string = 'true'

  @Optional({ through: 'agenda://neighbourhoodUrl', resolveLanguage: 'literal' })
  neighbourhoodUrl: string = ''

  @Optional({ through: 'agenda://role', resolveLanguage: 'literal' })
  role: string = 'owner'
}

export const CALENDAR_META_ANNOTATIONS: ShapeAnnotations = {
  fields: {
    name: { label: 'Name', inputType: 'text', group: 'primary', order: 0 },
    color: { label: 'Color', inputType: 'text', group: 'primary', order: 1 },
    description: { label: 'Description', inputType: 'textarea', group: 'details', order: 2 },
    isDefault: { label: 'Default', inputType: 'hidden', group: 'system', order: -1 },
    isVisible: { label: 'Visible', inputType: 'hidden', group: 'system', order: -1 },
    neighbourhoodUrl: { label: 'Shared URL', inputType: 'hidden', group: 'system', order: -1 },
    role: { label: 'Role', inputType: 'select', group: 'system', order: -1, options: ['owner', 'editor', 'viewer'] }
  },
  defaults: {
    color: '#4285f4',
    isDefault: 'false',
    isVisible: 'true',
    role: 'owner'
  },
  rules: [],
  icsMapping: {}
}
