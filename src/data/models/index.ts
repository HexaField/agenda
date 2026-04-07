import { Ad4mModel } from '@coasys/ad4m'
import { AgendaEvent, EVENT_ANNOTATIONS } from './event'
import { MeetingRequest, MEETING_REQUEST_ANNOTATIONS } from './meeting-request'
import { FreeBusy, FREE_BUSY_ANNOTATIONS } from './freebusy'
import { CalendarMeta, CALENDAR_META_ANNOTATIONS } from './calendar-meta'
import type { ShapeAnnotations } from '../annotations/types'

export interface RegisteredModel {
  modelClass: typeof Ad4mModel
  annotations: ShapeAnnotations
}

export const MODEL_REGISTRY: Record<string, RegisteredModel> = {
  AgendaEvent: { modelClass: AgendaEvent as unknown as typeof Ad4mModel, annotations: EVENT_ANNOTATIONS },
  MeetingRequest: {
    modelClass: MeetingRequest as unknown as typeof Ad4mModel,
    annotations: MEETING_REQUEST_ANNOTATIONS
  },
  FreeBusy: { modelClass: FreeBusy as unknown as typeof Ad4mModel, annotations: FREE_BUSY_ANNOTATIONS },
  CalendarMeta: { modelClass: CalendarMeta as unknown as typeof Ad4mModel, annotations: CALENDAR_META_ANNOTATIONS }
}

/** All model classes for registration */
export const ALL_MODELS = [AgendaEvent, MeetingRequest, FreeBusy, CalendarMeta]

export { AgendaEvent, EVENT_ANNOTATIONS } from './event'
export { MeetingRequest, MEETING_REQUEST_ANNOTATIONS } from './meeting-request'
export { FreeBusy, FREE_BUSY_ANNOTATIONS } from './freebusy'
export { CalendarMeta, CALENDAR_META_ANNOTATIONS } from './calendar-meta'
