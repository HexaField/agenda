import { createSignal, createMemo } from 'solid-js'

export type ViewMode = 'day' | 'week' | 'month' | 'agenda'

const [viewMode, setViewMode] = createSignal<ViewMode>('week')
const [selectedDate, setSelectedDate] = createSignal(new Date())

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

const weekStart = createMemo(() => getMonday(selectedDate()))
const weekEnd = createMemo(() => {
  const end = new Date(weekStart())
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
})

const monthStart = createMemo(() => {
  const d = new Date(selectedDate())
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
})

function navigateNext() {
  const d = new Date(selectedDate())
  const mode = viewMode()
  if (mode === 'day') d.setDate(d.getDate() + 1)
  else if (mode === 'week') d.setDate(d.getDate() + 7)
  else d.setMonth(d.getMonth() + 1)
  setSelectedDate(d)
}

function navigatePrev() {
  const d = new Date(selectedDate())
  const mode = viewMode()
  if (mode === 'day') d.setDate(d.getDate() - 1)
  else if (mode === 'week') d.setDate(d.getDate() - 7)
  else d.setMonth(d.getMonth() - 1)
  setSelectedDate(d)
}

function navigateToday() {
  setSelectedDate(new Date())
}

function navigateToDate(date: Date) {
  setSelectedDate(date)
}

export const viewState = {
  viewMode,
  setViewMode,
  selectedDate,
  setSelectedDate,
  weekStart,
  weekEnd,
  monthStart,
  navigateNext,
  navigatePrev,
  navigateToday,
  navigateToDate
}
