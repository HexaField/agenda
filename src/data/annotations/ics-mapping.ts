import type { ShapeAnnotations } from './types'

/**
 * Map ICS VEVENT fields to model property names using the icsMapping table.
 */
export function icsToModelData(
  veventFields: Record<string, string>,
  annotations: ShapeAnnotations
): Record<string, string> {
  const reverseMap: Record<string, string> = {}
  for (const [propName, icsField] of Object.entries(annotations.icsMapping ?? {})) {
    reverseMap[icsField] = propName
  }

  const result: Record<string, string> = {}
  for (const [icsField, value] of Object.entries(veventFields)) {
    const propName = reverseMap[icsField]
    if (propName) result[propName] = value
  }
  return result
}

/**
 * Map model data to ICS fields using the icsMapping table.
 */
export function modelDataToIcs(data: Record<string, unknown>, annotations: ShapeAnnotations): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [propName, icsField] of Object.entries(annotations.icsMapping ?? {})) {
    if (data[propName] !== undefined && data[propName] !== '') {
      result[icsField] = String(data[propName])
    }
  }
  return result
}
