import { createSignal } from 'solid-js'
import { useCalendar } from '../state/calendar-state'

interface QuickCreateProps {
  date: Date
  hour: number
  onClose: () => void
}

export function QuickCreate(props: QuickCreateProps) {
  const { addEvent, calendars } = useCalendar()
  const [name, setName] = createSignal('')

  const startDate = () => {
    const d = new Date(props.date)
    d.setHours(props.hour, 0, 0, 0)
    return d
  }

  const endDate = () => {
    const d = new Date(startDate())
    d.setHours(d.getHours() + 1)
    return d
  }

  const handleSave = () => {
    const n = name().trim()
    if (!n) return
    const defaultCal = calendars.find((c) => c.isDefault) ?? calendars[0]
    addEvent({
      name: n,
      startDate: startDate().toISOString(),
      endDate: endDate().toISOString(),
      calendarId: defaultCal.id,
      location: '',
      description: '',
      status: 'EventScheduled',
      visibility: 'private'
    })
    props.onClose()
  }

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={props.onClose}>
      <div
        class="w-80 rounded-lg border border-zinc-700 bg-zinc-900 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="text"
          class="mb-3 w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
          placeholder="Event name"
          value={name()}
          onInput={(e) => setName(e.currentTarget.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          autofocus
        />
        <div class="mb-3 text-xs text-zinc-400">
          {startDate().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}{' '}
          {startDate().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
          {' – '}
          {endDate().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
        </div>
        <div class="flex justify-end gap-2">
          <button class="px-3 py-1 text-xs text-zinc-400 hover:text-white" onClick={props.onClose}>
            Cancel
          </button>
          <button class="rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-500" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
