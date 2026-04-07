import type { ShapeAnnotations } from './types'

export interface ValidationError {
  field: string
  message: string
}

/**
 * Validate data against annotation rules.
 * Returns empty array if valid.
 */
export function validate(
  data: Record<string, unknown>,
  annotations: ShapeAnnotations,
  modelMetadata: { properties: Array<{ name: string; required: boolean }> }
): ValidationError[] {
  const errors: ValidationError[] = []

  // Check required fields (from model metadata)
  for (const prop of modelMetadata.properties) {
    if (prop.required && (data[prop.name] === undefined || data[prop.name] === '')) {
      const fieldAnnotation = annotations.fields[prop.name]
      errors.push({
        field: prop.name,
        message: `${fieldAnnotation?.label ?? prop.name} is required`
      })
    }
  }

  // Check annotation rules
  for (const rule of annotations.rules) {
    if (rule.type === 'comparison' && rule.referenceField && rule.operator) {
      const fieldVal = data[rule.field]
      const refVal = data[rule.referenceField]
      if (fieldVal !== undefined && refVal !== undefined) {
        if (!evaluateComparison(fieldVal, rule.operator, refVal)) {
          errors.push({ field: rule.field, message: rule.message })
        }
      }
    }
    if (rule.type === 'pattern' && rule.pattern) {
      const val = data[rule.field]
      if (val !== undefined && val !== '' && !new RegExp(rule.pattern).test(String(val))) {
        errors.push({ field: rule.field, message: rule.message })
      }
    }
  }

  return errors
}

function evaluateComparison(a: unknown, op: string, b: unknown): boolean {
  const av = String(a)
  const bv = String(b)
  switch (op) {
    case '>':
      return av > bv
    case '<':
      return av < bv
    case '>=':
      return av >= bv
    case '<=':
      return av <= bv
    case '==':
      return av === bv
    case '!=':
      return av !== bv
    default:
      return true
  }
}
