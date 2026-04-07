export interface ShapeAnnotations {
  fields: Record<string, FieldAnnotation>
  defaults: Record<string, string | number | boolean>
  rules: ValidationRule[]
  icsMapping?: Record<string, string>
}

export interface FieldAnnotation {
  label: string
  inputType: InputType
  group: string
  order: number
  options?: string[]
}

export type InputType =
  | 'text'
  | 'textarea'
  | 'url'
  | 'datetime'
  | 'date'
  | 'time'
  | 'duration'
  | 'select'
  | 'rrule'
  | 'did-list'
  | 'calendar-select'
  | 'hidden'

export interface ValidationRule {
  type: 'comparison' | 'pattern' | 'custom'
  field: string
  operator?: '>' | '<' | '>=' | '<=' | '==' | '!='
  referenceField?: string
  pattern?: string
  message: string
}
