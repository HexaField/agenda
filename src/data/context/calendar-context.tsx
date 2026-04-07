import { createContext, useContext, type ParentComponent } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import { MOCK_EVENTS, MOCK_CALENDARS, type MockEvent, type MockCalendar } from './mock-data'

export interface CalendarContextValue {
  events: MockEvent[]
  calendars: MockCalendar[]
  addEvent: (event: Omit<MockEvent, 'id'>) => void
  updateEvent: (id: string, data: Partial<MockEvent>) => void
  deleteEvent: (id: string) => void
  toggleCalendarVisibility: (id: string) => void
}

const CalendarContext = createContext<CalendarContextValue>()

export const CalendarProvider: ParentComponent = (props) => {
  const [state, setState] = createStore({
    events: [...MOCK_EVENTS],
    calendars: [...MOCK_CALENDARS]
  })

  let nextId = 100

  const value: CalendarContextValue = {
    get events() {
      return state.events
    },
    get calendars() {
      return state.calendars
    },
    addEvent(data) {
      setState(
        produce((s) => {
          s.events.push({ ...data, id: `evt-${nextId++}` } as MockEvent)
        })
      )
    },
    updateEvent(id, data) {
      setState(
        produce((s) => {
          const idx = s.events.findIndex((e) => e.id === id)
          if (idx >= 0) Object.assign(s.events[idx], data)
        })
      )
    },
    deleteEvent(id) {
      setState('events', (evts) => evts.filter((e) => e.id !== id))
    },
    toggleCalendarVisibility(id) {
      setState(
        produce((s) => {
          const cal = s.calendars.find((c) => c.id === id)
          if (cal) cal.isVisible = !cal.isVisible
        })
      )
    }
  }

  return <CalendarContext.Provider value={value}>{props.children}</CalendarContext.Provider>
}

export function useCalendar(): CalendarContextValue {
  const ctx = useContext(CalendarContext)
  if (!ctx) throw new Error('useCalendar must be used within CalendarProvider')
  return ctx
}
