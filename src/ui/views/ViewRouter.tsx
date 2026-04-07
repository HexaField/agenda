import { Switch, Match } from 'solid-js'
import { viewState } from '../state/view-state'
import { WeekView } from './WeekView'
import { DayView } from './DayView'
import { MonthView } from './MonthView'
import { AgendaView } from './AgendaView'

export function ViewRouter() {
  return (
    <Switch>
      <Match when={viewState.viewMode() === 'week'}>
        <WeekView />
      </Match>
      <Match when={viewState.viewMode() === 'day'}>
        <DayView />
      </Match>
      <Match when={viewState.viewMode() === 'month'}>
        <MonthView />
      </Match>
      <Match when={viewState.viewMode() === 'agenda'}>
        <AgendaView />
      </Match>
    </Switch>
  )
}
