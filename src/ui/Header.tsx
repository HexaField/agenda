import { For } from 'solid-js'
import { viewState, type ViewMode } from './state/view-state'

const VIEW_MODES: ViewMode[] = ['day', 'week', 'month', 'agenda']

function formatDateRange(): string {
  const mode = viewState.viewMode()
  const d = viewState.selectedDate()
  const opts: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' }

  if (mode === 'day') {
    return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', ...opts })
  }
  if (mode === 'week') {
    const start = viewState.weekStart()
    const end = viewState.weekEnd()
    const sameMonth = start.getMonth() === end.getMonth()
    if (sameMonth) {
      return `${start.getDate()} – ${end.getDate()} ${start.toLocaleDateString(undefined, opts)}`
    }
    return `${start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
  }
  return d.toLocaleDateString(undefined, opts)
}

export function Header() {
  return (
    <header class="flex shrink-0 items-center gap-4 border-b border-zinc-800 px-4 py-2">
      <h1 class="mr-4 text-lg font-semibold">Agenda</h1>

      <button
        class="rounded-md bg-zinc-800 px-3 py-1 text-sm hover:bg-zinc-700"
        onClick={() => viewState.navigateToday()}
      >
        Today
      </button>

      <button class="rounded-md p-1 hover:bg-zinc-800" onClick={() => viewState.navigatePrev()}>
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button class="rounded-md p-1 hover:bg-zinc-800" onClick={() => viewState.navigateNext()}>
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <span class="min-w-48 text-sm font-medium">{formatDateRange()}</span>

      <div class="ml-auto flex overflow-hidden rounded-md border border-zinc-700">
        <For each={VIEW_MODES}>
          {(mode) => (
            <button
              class={`px-3 py-1 text-xs capitalize ${viewState.viewMode() === mode ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
              onClick={() => viewState.setViewMode(mode)}
            >
              {mode}
            </button>
          )}
        </For>
      </div>
    </header>
  )
}
