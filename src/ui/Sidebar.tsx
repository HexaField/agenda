import { For } from 'solid-js'
import { useCalendar } from './state/calendar-state'
import { DatePicker } from './components/DatePicker'

export function Sidebar() {
  const { calendars, toggleCalendarVisibility } = useCalendar()

  return (
    <aside class="flex w-56 shrink-0 flex-col overflow-y-auto border-r border-zinc-800">
      <div class="p-3">
        <DatePicker />
      </div>

      <div class="px-3 pb-3">
        <h2 class="mb-2 text-xs font-semibold tracking-wider text-zinc-400 uppercase">Calendars</h2>
        <For each={calendars}>
          {(cal) => (
            <label class="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-zinc-900">
              <input
                type="checkbox"
                checked={cal.isVisible}
                onChange={() => toggleCalendarVisibility(cal.id)}
                class="accent-current"
                style={{ 'accent-color': cal.color }}
              />
              <span class="h-2.5 w-2.5 shrink-0 rounded-full" style={{ 'background-color': cal.color }} />
              <span class="truncate">{cal.name}</span>
            </label>
          )}
        </For>
      </div>
    </aside>
  )
}
