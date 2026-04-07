import { createSignal } from 'solid-js'
import type { MockEvent } from '../../data/context/mock-data'
import { useCalendar } from '../state/calendar-state'
import { ModelForm } from '../forms/ModelForm'
import { EVENT_ANNOTATIONS } from '../../data/models/event'

interface EventDetailProps {
  event: MockEvent
  color: string
  onClose: () => void
}

export function EventDetail(props: EventDetailProps) {
  const { updateEvent, deleteEvent } = useCalendar()
  const [editing, setEditing] = createSignal(false)
  const [formData, setFormData] = createSignal<Record<string, string>>({ ...props.event } as Record<string, string>)

  const start = new Date(props.event.startDate)
  const end = new Date(props.event.endDate)
  const dateFmt: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
  const timeFmt: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false }

  const handleSave = () => {
    updateEvent(props.event.id, formData())
    setEditing(false)
    props.onClose()
  }

  const handleDelete = () => {
    deleteEvent(props.event.id)
    props.onClose()
  }

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={props.onClose}>
      <div
        class="max-h-[80vh] w-96 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Color bar */}
        <div class="h-2 rounded-t-lg" style={{ 'background-color': props.color }} />

        <div class="p-4">
          {editing() ? (
            <>
              <ModelForm
                annotations={EVENT_ANNOTATIONS}
                data={formData()}
                onChange={(field, value) => setFormData((prev) => ({ ...prev, [field]: value }))}
              />
              <div class="mt-4 flex justify-end gap-2">
                <button class="px-3 py-1 text-xs text-zinc-400 hover:text-white" onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button
                  class="rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-500"
                  onClick={handleSave}
                >
                  Save
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 class="mb-2 text-lg font-semibold">{props.event.name}</h2>
              <div class="mb-1 text-sm text-zinc-400">{start.toLocaleDateString(undefined, dateFmt)}</div>
              <div class="mb-3 text-sm text-zinc-400">
                {start.toLocaleTimeString(undefined, timeFmt)} – {end.toLocaleTimeString(undefined, timeFmt)}
              </div>
              {props.event.location && <div class="mb-2 text-sm text-zinc-300">📍 {props.event.location}</div>}
              {props.event.description && <div class="mb-2 text-sm text-zinc-400">{props.event.description}</div>}
              <div class="mt-4 flex justify-end gap-2">
                <button class="px-3 py-1 text-xs text-red-400 hover:text-red-300" onClick={handleDelete}>
                  Delete
                </button>
                <button
                  class="rounded bg-zinc-700 px-3 py-1.5 text-xs text-white hover:bg-zinc-600"
                  onClick={() => setEditing(true)}
                >
                  Edit
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
