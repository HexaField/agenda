import { describe, it, expect } from 'vitest'
import { MODEL_REGISTRY, ALL_MODELS } from '../models'
import { getPropertiesMetadata, getRelationsMetadata } from '@coasys/ad4m'

describe('Model Registry', () => {
  it('MR-01: every model in registry has a modelClass', () => {
    for (const [name, entry] of Object.entries(MODEL_REGISTRY)) {
      expect(entry.modelClass).toBeTruthy()
      expect(name).toBeTruthy()
    }
  })

  it('MR-02: every model has annotations in the registry', () => {
    for (const entry of Object.values(MODEL_REGISTRY)) {
      expect(entry.modelClass).toBeTruthy()
      expect(entry.annotations).toBeTruthy()
      expect(entry.annotations.fields).toBeTruthy()
    }
  })

  it('MR-06: every model property has a corresponding field annotation', () => {
    for (const [_name, entry] of Object.entries(MODEL_REGISTRY)) {
      const props = getPropertiesMetadata(entry.modelClass)
      const rels = getRelationsMetadata(entry.modelClass)
      const allPropNames = [...Object.keys(props), ...Object.keys(rels)]
      for (const propName of allPropNames) {
        expect(entry.annotations.fields).toHaveProperty(propName)
      }
    }
  })

  it('MR-07: annotation defaults only reference declared property names', () => {
    for (const entry of Object.values(MODEL_REGISTRY)) {
      const props = getPropertiesMetadata(entry.modelClass)
      const rels = getRelationsMetadata(entry.modelClass)
      const allPropNames = new Set([...Object.keys(props), ...Object.keys(rels)])
      for (const key of Object.keys(entry.annotations.defaults)) {
        expect(allPropNames.has(key)).toBe(true)
      }
    }
  })

  it('MR-08: annotation validation rules only reference declared property names', () => {
    for (const entry of Object.values(MODEL_REGISTRY)) {
      const props = getPropertiesMetadata(entry.modelClass)
      const rels = getRelationsMetadata(entry.modelClass)
      const allPropNames = new Set([...Object.keys(props), ...Object.keys(rels)])
      for (const rule of entry.annotations.rules) {
        expect(allPropNames.has(rule.field)).toBe(true)
        if (rule.referenceField) {
          expect(allPropNames.has(rule.referenceField)).toBe(true)
        }
      }
    }
  })

  it('MR-09: ICS mapping keys only reference declared property names', () => {
    for (const entry of Object.values(MODEL_REGISTRY)) {
      const props = getPropertiesMetadata(entry.modelClass)
      const rels = getRelationsMetadata(entry.modelClass)
      const allPropNames = new Set([...Object.keys(props), ...Object.keys(rels)])
      for (const key of Object.keys(entry.annotations.icsMapping ?? {})) {
        expect(allPropNames.has(key)).toBe(true)
      }
    }
  })

  it('MR-04: model property names are unique within each model', () => {
    for (const entry of Object.values(MODEL_REGISTRY)) {
      const props = Object.keys(getPropertiesMetadata(entry.modelClass))
      const rels = Object.keys(getRelationsMetadata(entry.modelClass))
      const all = [...props, ...rels]
      expect(new Set(all).size).toBe(all.length)
    }
  })

  it('MR-05: every model property has a valid predicate URI', () => {
    for (const entry of Object.values(MODEL_REGISTRY)) {
      const props = getPropertiesMetadata(entry.modelClass)
      for (const meta of Object.values(props)) {
        expect(meta.through).toMatch(/^(schema|agenda):\/\//)
      }
      const rels = getRelationsMetadata(entry.modelClass)
      for (const meta of Object.values(rels)) {
        expect(meta.predicate).toMatch(/^(schema|agenda):\/\//)
      }
    }
  })

  it('ALL_MODELS contains all registry models', () => {
    expect(ALL_MODELS.length).toBe(Object.keys(MODEL_REGISTRY).length)
  })
})
