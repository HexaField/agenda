import type { ShapeAnnotations } from './types'

/**
 * Apply annotation defaults to data before create.
 * Pure function — takes raw data, returns data with defaults merged.
 */
export function applyDefaults(data: Record<string, unknown>, annotations: ShapeAnnotations): Record<string, unknown> {
  const result = { ...data }
  for (const [key, defaultValue] of Object.entries(annotations.defaults)) {
    if (result[key] === undefined || result[key] === '') {
      result[key] = defaultValue
    }
  }
  return result
}
