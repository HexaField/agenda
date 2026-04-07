import type { PerspectiveProxy } from '@coasys/ad4m'
import { AgendaEvent } from '../models/event'
import { expandOccurrences } from '../transforms/rrule'

export interface VisibleEvent {
  uri: string
  name: string
  startDate: string
  endDate: string
  location: string
  description: string
  calendarId: string
  status: string
  visibility: string
  isRecurrenceInstance: boolean
  parentUri?: string
}

/**
 * Pipeline: query → instances → expand recurrences → filter visible calendars
 */
export async function getVisibleEvents(
  perspective: PerspectiveProxy,
  windowStart: Date,
  windowEnd: Date,
  visibleCalendarIds: Set<string>
): Promise<VisibleEvent[]> {
  const events = (await AgendaEvent.query(perspective).where({}).get()) as AgendaEvent[]

  const inRange = events.filter((e) => {
    if (!visibleCalendarIds.has(e.calendarId)) return false
    const start = new Date(e.startDate)
    const end = new Date(e.endDate)
    return (start <= windowEnd && end >= windowStart) || e.recurrence
  })

  const result: VisibleEvent[] = []
  for (const event of inRange) {
    if (event.recurrence) {
      const occurrences = expandOccurrences(
        { startDate: event.startDate, endDate: event.endDate, recurrence: event.recurrence, uri: event.baseExpression },
        windowStart,
        windowEnd
      )
      for (const occ of occurrences) {
        result.push({
          uri: `${event.baseExpression}:${occ.startDate}`,
          name: event.name,
          startDate: occ.startDate,
          endDate: occ.endDate,
          location: event.location,
          description: event.description,
          calendarId: event.calendarId,
          status: event.status,
          visibility: event.visibility,
          isRecurrenceInstance: true,
          parentUri: event.baseExpression
        })
      }
    } else {
      result.push({
        uri: event.baseExpression,
        name: event.name,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        description: event.description,
        calendarId: event.calendarId,
        status: event.status,
        visibility: event.visibility,
        isRecurrenceInstance: false
      })
    }
  }

  return result.sort((a, b) => a.startDate.localeCompare(b.startDate))
}
