import type { JSX } from 'solid-js'
import type { MockEvent } from '../../data/context/mock-data'
import { createSignal, Show } from 'solid-js'
import { EventDetail } from './EventDetail'

interface EventBlockProps {
  event: MockEvent
  color: string
  style?: JSX.CSSProperties
}

export function EventBlock(props: EventBlockProps) {
  const [showDetail, setShowDetail] = createSignal(false)
  const start = () => new Date(props.event.startDate)
  const end = () => new Date(props.event.endDate)

  const timeStr = () => {
    const fmt = (d: Date) => d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
    return `${fmt(start())} – ${fmt(end())}`
  }

  return (
    <>
      <div
        class="cursor-pointer overflow-hidden rounded px-1.5 py-0.5 text-xs transition-all hover:brightness-110"
        style={{
          ...props.style,
          'background-color': props.color + 'dd',
          color: 'white'
        }}
        onClick={() => setShowDetail(true)}
      >
        <div class="truncate font-medium">{props.event.name}</div>
        <div class="truncate text-[10px] opacity-80">{timeStr()}</div>
      </div>

      <Show when={showDetail()}>
        <EventDetail event={props.event} color={props.color} onClose={() => setShowDetail(false)} />
      </Show>
    </>
  )
}
