import ICAL from 'ical.js'

export interface ParsedRRule {
  freq: string
  interval: number
  count?: number
  until?: Date
  byDay?: string[]
  byMonth?: number[]
  byMonthDay?: number[]
}

export interface Occurrence {
  startDate: string
  endDate: string
  parentUri: string
}

export function parseRRule(rruleString: string): ParsedRRule {
  const recur = ICAL.Recur.fromString(rruleString)
  return {
    freq: recur.freq,
    interval: recur.interval || 1,
    count: recur.count || undefined,
    until: recur.until ? recur.until.toJSDate() : undefined,
    byDay: recur.parts?.BYDAY ?? undefined,
    byMonth: recur.parts?.BYMONTH ?? undefined,
    byMonthDay: recur.parts?.BYMONTHDAY ?? undefined
  }
}

export function expandOccurrences(
  event: { startDate: string; endDate: string; recurrence: string; uri: string },
  windowStart: Date,
  windowEnd: Date,
  exdates: Date[] = []
): Occurrence[] {
  if (!event.recurrence) return []

  const recur = ICAL.Recur.fromString(event.recurrence)
  const dtstart = ICAL.Time.fromJSDate(new Date(event.startDate))
  const duration = new Date(event.endDate).getTime() - new Date(event.startDate).getTime()

  const iterator = recur.iterator(dtstart)
  const occurrences: Occurrence[] = []
  const maxIterations = 1000
  let iterations = 0

  let next = iterator.next()
  while (next && iterations < maxIterations) {
    iterations++
    const jsDate = next.toJSDate()
    if (jsDate > windowEnd) break

    const endJsDate = new Date(jsDate.getTime() + duration)
    if (endJsDate >= windowStart) {
      const isExcluded = exdates.some((ex) => ex.getTime() === jsDate.getTime())
      if (!isExcluded) {
        occurrences.push({
          startDate: jsDate.toISOString(),
          endDate: endJsDate.toISOString(),
          parentUri: event.uri
        })
      }
    }

    next = iterator.next()
  }

  return occurrences
}
