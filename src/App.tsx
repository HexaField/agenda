import { CalendarProvider } from './data/context/calendar-context'
import { Shell } from './ui/Shell'

export default function App() {
  return (
    <CalendarProvider>
      <Shell />
    </CalendarProvider>
  )
}
