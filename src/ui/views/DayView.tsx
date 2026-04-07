import { createMemo, createSignal, Show, onMount } from 'solid-js'
import { viewState } from '../state/view-state'
import { useCalendar } from '../state/calendar-state'
import { TimeGrid } from '../components/TimeGrid'
import { QuickCreate } from '../events/QuickCreate'

export function DayView() {
  const { events, calendars } = useCalendar()
  const [quickCreate, setQuickCreate] = createSignal<{ date: Date; hour: number } | null>(null)
  let scrollRef: HTMLDivElement | undefined

  const dates = createMemo(() => {
    const d = new Date(viewState.selectedDate())
    d.setHours(0, 0, 0, 0)
    return [d]
  })

  const visibleCalIds = createMemo(() => new Set(calendars.filter((c) => c.isVisible).map((c) => c.id)))
  const filteredEvents = createMemo(() => events.filter((e) => visibleCalIds().has(e.calendarId)))
  const calendarColors = createMemo(() => {
    const map: Record<string, string> = {}
    for (const c of calendars) map[c.id] = c.color
    return map
  })

  onMount(() => {
    scrollRef?.scrollTo({ top: 7 * 60 })
  })

  return (
    <div class="flex h-full flex-col overflow-hidden">
      <div class="flex-1 overflow-auto" ref={scrollRef}>
        <TimeGrid
          dates={dates()}
          events={filteredEvents()}
          calendarColors={calendarColors()}
          onSlotClick={(date, hour) => setQuickCreate({ date, hour })}
        />
      </div>
      <Show when={quickCreate()}>
        {(qc) => <QuickCreate date={qc().date} hour={qc().hour} onClose={() => setQuickCreate(null)} />}
      </Show>
    </div>
  )
}
