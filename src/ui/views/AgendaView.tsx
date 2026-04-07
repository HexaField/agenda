import { createMemo, For, Show } from 'solid-js'
import { useCalendar } from '../state/calendar-state'

export function AgendaView() {
  const { events, calendars } = useCalendar()
  const visibleCalIds = createMemo(() => new Set(calendars.filter((c) => c.isVisible).map((c) => c.id)))
  const calColorMap = createMemo(() => {
    const m: Record<string, string> = {}
    for (const c of calendars) m[c.id] = c.color
    return m
  })

  const upcoming = createMemo(() => {
    const now = new Date()
    return events
      .filter((e) => visibleCalIds().has(e.calendarId) && new Date(e.endDate) >= now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  })

  // Group by date
  const grouped = createMemo(() => {
    const groups: { date: string; events: typeof upcoming extends () => infer T ? T : never }[] = []
    let currentDate = ''
    for (const evt of upcoming()) {
      const dateStr = new Date(evt.startDate).toDateString()
      if (dateStr !== currentDate) {
        currentDate = dateStr
        groups.push({ date: dateStr, events: [] })
      }
      groups[groups.length - 1].events.push(evt)
    }
    return groups
  })

  const timeFmt: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false }
  const dateFmt: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' }

  return (
    <div class="h-full max-w-2xl overflow-auto p-4">
      <Show when={grouped().length === 0}>
        <p class="text-sm text-zinc-500">No upcoming events</p>
      </Show>
      <For each={grouped()}>
        {(group) => (
          <div class="mb-6">
            <h3 class="sticky top-0 mb-2 bg-zinc-950 py-1 text-xs font-semibold tracking-wider text-zinc-400 uppercase">
              {new Date(group.date).toLocaleDateString(undefined, dateFmt)}
            </h3>
            <For each={group.events}>
              {(evt) => (
                <div class="flex items-start gap-3 border-b border-zinc-800/50 py-2">
                  <div
                    class="w-1 shrink-0 self-stretch rounded-full"
                    style={{ 'background-color': calColorMap()[evt.calendarId] }}
                  />
                  <div class="w-24 shrink-0 pt-0.5 text-xs text-zinc-500">
                    {new Date(evt.startDate).toLocaleTimeString(undefined, timeFmt)} –{' '}
                    {new Date(evt.endDate).toLocaleTimeString(undefined, timeFmt)}
                  </div>
                  <div>
                    <div class="text-sm font-medium">{evt.name}</div>
                    <Show when={evt.location}>
                      <div class="mt-0.5 text-xs text-zinc-500">📍 {evt.location}</div>
                    </Show>
                  </div>
                </div>
              )}
            </For>
          </div>
        )}
      </For>
    </div>
  )
}
