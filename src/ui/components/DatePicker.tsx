import { createMemo, For } from 'solid-js'
import { viewState } from '../state/view-state'

export function DatePicker() {
  const weeks = createMemo(() => {
    const d = viewState.selectedDate()
    const year = d.getFullYear()
    const month = d.getMonth()
    const first = new Date(year, month, 1)
    const startDay = (first.getDay() + 6) % 7 // Monday=0
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const rows: Date[][] = []
    let row: Date[] = []

    // Fill leading blanks with prev month
    for (let i = 0; i < startDay; i++) {
      const pd = new Date(year, month, 1 - startDay + i)
      row.push(pd)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      row.push(new Date(year, month, day))
      if (row.length === 7) {
        rows.push(row)
        row = []
      }
    }

    // Fill trailing
    if (row.length > 0) {
      let next = 1
      while (row.length < 7) row.push(new Date(year, month + 1, next++))
      rows.push(row)
    }

    return rows
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const isToday = (d: Date) => d.toDateString() === today.toDateString()
  const isSelected = (d: Date) => d.toDateString() === viewState.selectedDate().toDateString()
  const isCurrentMonth = (d: Date) => d.getMonth() === viewState.selectedDate().getMonth()

  return (
    <div class="select-none">
      <div class="mb-2 flex items-center justify-between">
        <button
          class="p-0.5 text-zinc-400 hover:text-white"
          onClick={() => {
            const d = new Date(viewState.selectedDate())
            d.setMonth(d.getMonth() - 1)
            viewState.setSelectedDate(d)
          }}
        >
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span class="text-xs font-medium">
          {viewState.selectedDate().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </span>
        <button
          class="p-0.5 text-zinc-400 hover:text-white"
          onClick={() => {
            const d = new Date(viewState.selectedDate())
            d.setMonth(d.getMonth() + 1)
            viewState.setSelectedDate(d)
          }}
        >
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div class="mb-1 grid grid-cols-7 text-center text-[10px] text-zinc-500">
        <For each={['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']}>{(d) => <span>{d}</span>}</For>
      </div>

      <For each={weeks()}>
        {(week) => (
          <div class="grid grid-cols-7 text-center">
            <For each={week}>
              {(day) => (
                <button
                  class={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[11px] ${!isCurrentMonth(day) ? 'text-zinc-600' : 'text-zinc-300'} ${isToday(day) ? 'bg-blue-600 font-bold text-white' : ''} ${isSelected(day) && !isToday(day) ? 'bg-zinc-700' : ''} hover:bg-zinc-700`}
                  onClick={() => viewState.navigateToDate(new Date(day))}
                >
                  {day.getDate()}
                </button>
              )}
            </For>
          </div>
        )}
      </For>
    </div>
  )
}
