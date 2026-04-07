import { createMemo, For } from 'solid-js'
import { viewState } from '../state/view-state'
import { useCalendar } from '../state/calendar-state'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function MonthView() {
  const { events, calendars } = useCalendar()
  const visibleCalIds = createMemo(() => new Set(calendars.filter((c) => c.isVisible).map((c) => c.id)))
  const calColorMap = createMemo(() => {
    const m: Record<string, string> = {}
    for (const c of calendars) m[c.id] = c.color
    return m
  })

  const weeks = createMemo(() => {
    const d = viewState.selectedDate()
    const year = d.getFullYear()
    const month = d.getMonth()
    const first = new Date(year, month, 1)
    const startDay = (first.getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const cells: Date[] = []
    for (let i = 0; i < startDay; i++) cells.push(new Date(year, month, 1 - startDay + i))
    for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(year, month, i))
    while (cells.length % 7 !== 0) cells.push(new Date(year, month + 1, cells.length - startDay - daysInMonth + 1))

    const rows: Date[][] = []
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
    return rows
  })

  const today = new Date()

  const eventsForDay = (day: Date) => {
    const key = day.toDateString()
    return events.filter((e) => visibleCalIds().has(e.calendarId) && new Date(e.startDate).toDateString() === key)
  }

  return (
    <div class="flex h-full flex-col overflow-auto p-2">
      <div class="mb-1 grid grid-cols-7">
        <For each={DAY_NAMES}>{(name) => <div class="py-1 text-center text-xs text-zinc-500">{name}</div>}</For>
      </div>
      <div class="grid flex-1 grid-rows-[repeat(auto-fill,1fr)]">
        <For each={weeks()}>
          {(week) => (
            <div class="grid min-h-24 grid-cols-7 border-t border-zinc-800">
              <For each={week}>
                {(day) => {
                  const isCurrentMonth = day.getMonth() === viewState.selectedDate().getMonth()
                  const isToday = day.toDateString() === today.toDateString()
                  const dayEvents = () => eventsForDay(day)

                  return (
                    <div
                      class={`cursor-pointer border-l border-zinc-800 p-1 hover:bg-zinc-900 ${!isCurrentMonth ? 'opacity-40' : ''}`}
                      onClick={() => {
                        viewState.navigateToDate(day)
                        viewState.setViewMode('day')
                      }}
                    >
                      <div
                        class={`mb-1 text-xs ${isToday ? 'flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white' : 'text-zinc-400'}`}
                      >
                        {day.getDate()}
                      </div>
                      <For each={dayEvents().slice(0, 3)}>
                        {(evt) => (
                          <div
                            class="mb-0.5 truncate rounded px-1 text-[10px] text-white"
                            style={{ 'background-color': calColorMap()[evt.calendarId] + 'cc' }}
                          >
                            {evt.name}
                          </div>
                        )}
                      </For>
                      {dayEvents().length > 3 && (
                        <div class="text-[10px] text-zinc-500">+{dayEvents().length - 3} more</div>
                      )}
                    </div>
                  )
                }}
              </For>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}
