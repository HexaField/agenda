import { Show } from 'solid-js'
import type { FieldAnnotation } from '../../data/annotations/types'
import { FIELD_REGISTRY } from './field-registry'

interface FieldRendererProps {
  annotation: FieldAnnotation
  value: string
  onChange: (value: string) => void
}

export function FieldRenderer(props: FieldRendererProps) {
  const Component = () => FIELD_REGISTRY[props.annotation.inputType]

  return (
    <Show when={Component()}>
      {(Comp) => {
        const C = Comp()
        return (
          <div class="mb-3">
            <label class="mb-1 block text-xs text-zinc-400">{props.annotation.label}</label>
            <C
              value={props.value ?? ''}
              onChange={props.onChange}
              label={props.annotation.label}
              options={props.annotation.options}
            />
          </div>
        )
      }}
    </Show>
  )
}
