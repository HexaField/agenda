import { For, createMemo } from 'solid-js'
import type { ShapeAnnotations } from '../../data/annotations/types'
import { FieldRenderer } from './FieldRenderer'

interface ModelFormProps {
  annotations: ShapeAnnotations
  data: Record<string, string>
  onChange: (field: string, value: string) => void
}

export function ModelForm(props: ModelFormProps) {
  const sortedFields = createMemo(() => {
    return Object.entries(props.annotations.fields)
      .filter(([_, a]) => a.inputType !== 'hidden')
      .sort(([, a], [, b]) => a.order - b.order)
  })

  const groups = createMemo(() => {
    const map = new Map<string, [string, (typeof props.annotations.fields)[string]][]>()
    for (const entry of sortedFields()) {
      const group = entry[1].group
      if (!map.has(group)) map.set(group, [])
      map.get(group)!.push(entry)
    }
    return [...map.entries()]
  })

  return (
    <div>
      <For each={groups()}>
        {([group, fields]) => (
          <div class="mb-4">
            <div class="mb-2 text-[10px] tracking-wider text-zinc-500 uppercase">{group}</div>
            <For each={fields}>
              {([key, annotation]) => (
                <FieldRenderer
                  annotation={annotation}
                  value={props.data[key] ?? ''}
                  onChange={(val) => props.onChange(key, val)}
                />
              )}
            </For>
          </div>
        )}
      </For>
    </div>
  )
}
