import { createMemo, createSignal, Show, For, onMount } from 'solid-js'
import { viewState } from '../state/view-state'
import { useCalendar } from '../state/calendar-state'
import { TimeGrid } from '../components/TimeGrid'
import { QuickCreate } from '../events/QuickCreate'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function WeekView() {
  const { events, calendars } = useCalendar()
  const [quickCreate, setQuickCreate] = createSignal<{ date: Date; hour: number } | null>(null)
  let scrollRef: HTMLDivElement | undefined

  const dates = createMemo(() => {
    const start = viewState.weekStart()
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      return d
    })
  })

  const visibleCalIds = createMemo(() => new Set(calendars.filter((c) => c.isVisible).map((c) => c.id)))
  const filteredEvents = createMemo(() => events.filter((e) => visibleCalIds().has(e.calendarId)))
  const calendarColors = createMemo(() => {
    const map: Record<string, string> = {}
    for (const c of calendars) map[c.id] = c.color
    return map
  })

  const today = new Date()

  onMount(() => {
    // Scroll to 7am
    scrollRef?.scrollTo({ top: 7 * 60 })
  })

  return (
    <div class="flex h-full flex-col overflow-hidden">
      {/* Day headers */}
      <div class="flex shrink-0 border-b border-zinc-800">
        <div class="w-16 shrink-0" />
        <For each={dates()}>
          {(d, i) => (
            <div
              class={`flex-1 border-l border-zinc-800 py-2 text-center ${d.toDateString() === today.toDateString() ? 'text-blue-400' : 'text-zinc-400'}`}
            >
              <div class="text-[11px] uppercase">{DAY_NAMES[i()]}</div>
              <div
                class={`text-lg font-semibold ${d.toDateString() === today.toDateString() ? 'mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white' : ''}`}
              >
                {d.getDate()}
              </div>
            </div>
          )}
        </For>
      </div>

      {/* Time grid */}
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
