import type { InputType } from '../../data/annotations/types'
import type { Component } from 'solid-js'

interface FieldProps {
  value: string
  onChange: (value: string) => void
  label: string
  options?: string[]
}

function TextInput(props: FieldProps) {
  return (
    <input
      type="text"
      value={props.value}
      onInput={(e) => props.onChange(e.currentTarget.value)}
      class="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
    />
  )
}

function TextareaInput(props: FieldProps) {
  return (
    <textarea
      value={props.value}
      onInput={(e) => props.onChange(e.currentTarget.value)}
      rows={3}
      class="w-full resize-y rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
    />
  )
}

function DatetimeInput(props: FieldProps) {
  const toLocal = (iso: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    const offset = d.getTimezoneOffset()
    const local = new Date(d.getTime() - offset * 60000)
    return local.toISOString().slice(0, 16)
  }
  return (
    <input
      type="datetime-local"
      value={toLocal(props.value)}
      onInput={(e) => props.onChange(new Date(e.currentTarget.value).toISOString())}
      class="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
    />
  )
}

function SelectInput(props: FieldProps) {
  return (
    <select
      value={props.value}
      onChange={(e) => props.onChange(e.currentTarget.value)}
      class="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
    >
      {(props.options ?? []).map((opt) => (
        <option value={opt}>{opt}</option>
      ))}
    </select>
  )
}

function UrlInput(props: FieldProps) {
  return (
    <input
      type="url"
      value={props.value}
      onInput={(e) => props.onChange(e.currentTarget.value)}
      class="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
    />
  )
}

export const FIELD_REGISTRY: Record<InputType, Component<FieldProps> | null> = {
  text: TextInput,
  textarea: TextareaInput,
  url: UrlInput,
  datetime: DatetimeInput,
  date: TextInput,
  time: TextInput,
  duration: TextInput,
  select: SelectInput,
  rrule: TextInput,
  'did-list': TextInput,
  'calendar-select': TextInput,
  hidden: null
}
