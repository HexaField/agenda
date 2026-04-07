import { For, createMemo } from 'solid-js'
import type { MockEvent } from '../../data/context/mock-data'
import { EventBlock } from '../events/EventBlock'

const HOUR_HEIGHT = 60
const HOURS = Array.from({ length: 24 }, (_, i) => i)

interface TimeGridProps {
  dates: Date[]
  events: MockEvent[]
  calendarColors: Record<string, string>
  onSlotClick?: (date: Date, hour: number) => void
}

export function TimeGrid(props: TimeGridProps) {
  const now = new Date()

  const eventsByColumn = createMemo(() => {
    const map: Record<string, MockEvent[]> = {}
    for (const d of props.dates) {
      const key = d.toDateString()
      map[key] = props.events.filter((e) => new Date(e.startDate).toDateString() === key)
    }
    return map
  })

  const currentTimeTop = createMemo(() => {
    return (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT
  })

  const isToday = (d: Date) => d.toDateString() === now.toDateString()

  return (
    <div class="relative flex flex-1 overflow-auto" id="time-grid-scroll">
      {/* Hour labels */}
      <div class="relative w-16 shrink-0" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
        <For each={HOURS}>
          {(h) => (
            <div
              class="absolute right-2 -translate-y-1/2 text-[11px] text-zinc-500"
              style={{ top: `${h * HOUR_HEIGHT}px` }}
            >
              {h === 0 ? '' : `${h.toString().padStart(2, '0')}:00`}
            </div>
          )}
        </For>
      </div>

      {/* Columns */}
      <div class="relative flex flex-1">
        <For each={props.dates}>
          {(date) => (
            <div class="relative flex-1 border-l border-zinc-800" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
              {/* Hour lines */}
              <For each={HOURS}>
                {(h) => (
                  <div
                    class="absolute w-full border-t border-zinc-800/50"
                    style={{ top: `${h * HOUR_HEIGHT}px` }}
                    onClick={() => props.onSlotClick?.(date, h)}
                  />
                )}
              </For>

              {/* Click zones */}
              <For each={HOURS}>
                {(h) => (
                  <div
                    class="absolute w-full cursor-pointer hover:bg-zinc-800/20"
                    style={{ top: `${h * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                    onClick={() => props.onSlotClick?.(date, h)}
                  />
                )}
              </For>

              {/* Events */}
              <For each={eventsByColumn()[date.toDateString()] ?? []}>
                {(event) => {
                  const start = new Date(event.startDate)
                  const end = new Date(event.endDate)
                  const topPx = (start.getHours() + start.getMinutes() / 60) * HOUR_HEIGHT
                  const durationHours = (end.getTime() - start.getTime()) / 3600000
                  const heightPx = Math.max(durationHours * HOUR_HEIGHT, 20)

                  return (
                    <EventBlock
                      event={event}
                      color={props.calendarColors[event.calendarId] ?? '#4285f4'}
                      style={{
                        position: 'absolute',
                        top: `${topPx}px`,
                        height: `${heightPx}px`,
                        left: '2px',
                        right: '4px'
                      }}
                    />
                  )
                }}
              </For>

              {/* Current time line */}
              {isToday(date) && (
                <div class="pointer-events-none absolute z-10 w-full" style={{ top: `${currentTimeTop()}px` }}>
                  <div class="flex items-center">
                    <div class="-ml-1.5 h-2.5 w-2.5 rounded-full bg-red-500" />
                    <div class="h-0.5 flex-1 bg-red-500" />
                  </div>
                </div>
              )}
            </div>
          )}
        </For>
      </div>
    </div>
  )
}
