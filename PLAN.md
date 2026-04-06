# Agenda: Implementation Plan

**Sovereign calendar on the Living Web, backed by AD4M.**

This document breaks each implementation layer into folder structure, interfaces, and specification-level test descriptions using MUST/MAY/SHOULD language. Once approved, we implement layer by layer.

---

## Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| `@living-web/ad4m-polyfill` | `navigator.graph` + `navigator.credentials` backed by AD4M executor | `file:../../living-web-ad4m-polyfill` (local) |
| `solid-js` | UI framework | latest |
| `tailwindcss` | Styling | 4.x |
| `ical.js` | ICS parsing/generation (VEVENT, RRULE, VALARM) | latest |
| `@solid-primitives/scheduled` | Debounced reactivity helpers | latest |

The AD4M polyfill provides the full `navigator.graph` API including `PersonalGraph`, `SharedGraph`, shapes, identity, and governance. Agenda writes against the neutral Living Web API — it does not import AD4M types directly.

---

## Package Structure

```
packages/client/
├── src/
│   ├── index.tsx                          # App mount
│   ├── index.css                          # Tailwind + base styles
│   ├── App.tsx                            # Root: bootstrap graph, render shell
│   │
│   ├── lib/                               # Layer 0 — Data Foundation
│   │   ├── types.ts                       # All domain types (CalendarEvent, MeetingRequest, FreeBusy, etc.)
│   │   ├── schemas.ts                     # Shape definitions (JSON) + schema constants
│   │   ├── calendar-store.ts              # Graph bootstrap, shape registration, CRUD operations
│   │   ├── query.ts                       # Date-range queries, instance resolution, SPARQL helpers
│   │   ├── ics.ts                         # ICS ↔ Event shape mapping (import/export)
│   │   ├── rrule.ts                       # RRULE parsing + occurrence expansion
│   │   └── predicates.ts                  # URI constants for schema:// and agenda:// predicates
│   │
│   ├── ui/                                # Layer 1 — Personal Calendar UI
│   │   ├── Shell.tsx                      # App shell: sidebar + main area + header
│   │   ├── Header.tsx                     # Navigation: view toggle, today button, date range label
│   │   ├── Sidebar.tsx                    # Calendar list, toggle visibility, create calendar
│   │   ├── views/
│   │   │   ├── WeekView.tsx               # 7-column time grid (default view)
│   │   │   ├── DayView.tsx                # Single-column time grid
│   │   │   ├── MonthView.tsx              # Month grid with event dots/titles
│   │   │   └── AgendaView.tsx             # Chronological list of upcoming events
│   │   ├── events/
│   │   │   ├── EventBlock.tsx             # Rendered event on the grid (colored, positioned)
│   │   │   ├── EventDetail.tsx            # Full event editor panel/modal
│   │   │   ├── QuickCreate.tsx            # Click-to-create popover (name, time, optional fields)
│   │   │   └── EventDrag.tsx              # Drag-to-resize / drag-to-move logic
│   │   ├── components/
│   │   │   ├── TimeGrid.tsx               # Shared hour-slot grid used by Week/Day views
│   │   │   ├── DatePicker.tsx             # Mini calendar for date navigation
│   │   │   ├── TimePicker.tsx             # Time input component
│   │   │   └── CalendarChip.tsx           # Colored label for calendar identity
│   │   └── hooks/
│   │       ├── useCalendarStore.ts        # Reactive bridge: graph store → SolidJS signals
│   │       ├── useViewState.ts            # Current view, selected date, visible range
│   │       ├── useEvents.ts               # Query + filter events for the visible range
│   │       └── useDragDrop.ts             # Pointer event management for grid interactions
│   │
│   ├── scheduling/                        # Layer 2 — Person-to-Person Scheduling
│   │   ├── meeting-request.ts             # Create/accept/decline/counter meeting requests
│   │   ├── invite-flow.ts                 # Auto-create shared graph for attendee negotiation
│   │   ├── InvitePanel.tsx                # UI for incoming/outgoing requests
│   │   └── ContactPicker.tsx              # Search known DIDs for attendee selection
│   │
│   ├── availability/                      # Layer 3 — Free/Busy & Availability
│   │   ├── freebusy.ts                    # Generate and publish FreeBusy from local events
│   │   ├── availability-overlay.ts        # Merge remote FreeBusy into scheduling view
│   │   ├── slot-finder.ts                 # Find first mutually free slot
│   │   └── AvailabilityStrip.tsx          # Visual overlay on time grid
│   │
│   ├── shared/                            # Layer 4 — Shared Calendars
│   │   ├── shared-calendar.ts             # Create/join/leave shared calendar graphs
│   │   ├── governance.ts                  # Role-based permissions (who can create/edit/delete)
│   │   └── SharedCalendarSettings.tsx     # UI for managing shared calendar membership + roles
│   │
│   └── interop/                           # Layer 5 — Adoption & Onboarding
│       ├── import-wizard.ts               # First-run import flow (ICS file, Google export)
│       ├── natural-language.ts            # Quick-add parsing ("Coffee tomorrow at 10am")
│       └── WelcomeWizard.tsx              # First-run UI
│
├── tests/                                 # Playwright E2E tests
│   └── ...
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Layer 0: Data Foundation

Everything above depends on this. No UI — pure data operations against `navigator.graph`.

### `lib/predicates.ts`

URI constants. Single source of truth for all predicate strings.

```typescript
// Schema.org predicates
export const SCHEMA = {
  name: 'schema://name',
  startDate: 'schema://startDate',
  endDate: 'schema://endDate',
  location: 'schema://location',
  description: 'schema://description',
  organizer: 'schema://organizer',
  attendee: 'schema://attendee',
  eventStatus: 'schema://eventStatus',
  eventAttendanceMode: 'schema://eventAttendanceMode',
  url: 'schema://url',
} as const

// Agenda-specific predicates
export const AGENDA = {
  recurrence: 'agenda://recurrence',
  reminder: 'agenda://reminder',
  visibility: 'agenda://visibility',
  calendarId: 'agenda://calendarId',
  icsUid: 'agenda://icsUid',
  // MeetingRequest predicates
  from: 'agenda://from',
  to: 'agenda://to',
  status: 'agenda://status',
  counterStart: 'agenda://counterStart',
  counterEnd: 'agenda://counterEnd',
  message: 'agenda://message',
  // FreeBusy predicates
  agent: 'agenda://agent',
  start: 'agenda://start',
  end: 'agenda://end',
  slots: 'agenda://slots',
  generated: 'agenda://generated',
} as const
```

### `lib/types.ts`

Domain types. These are the application-level types, not Living Web types.

```typescript
export interface CalendarEvent {
  uri: string                    // urn:event:<uuid>
  name: string                   // required
  startDate: string              // ISO 8601 datetime, required
  endDate: string                // ISO 8601 datetime, required
  location?: string
  description?: string
  organizer: string              // DID URI
  attendees: string[]            // DID URIs
  status: EventStatus
  attendanceMode?: AttendanceMode
  url?: string
  recurrence?: string            // RRULE string
  reminder?: string              // ISO 8601 duration (e.g. "PT15M")
  visibility: EventVisibility
  calendarId: string
  icsUid?: string                // for ICS interop
}

export type EventStatus = 'EventScheduled' | 'EventCancelled' | 'EventPostponed' | 'EventRescheduled'
export type EventVisibility = 'private' | 'busy' | 'public'
export type AttendanceMode = 'OnlineEventAttendanceMode' | 'OfflineEventAttendanceMode' | 'MixedEventAttendanceMode'

export interface MeetingRequest {
  uri: string
  eventUri: string
  from: string                   // DID
  to: string                     // DID
  status: RequestStatus
  counterStart?: string
  counterEnd?: string
  message?: string
}

export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'tentative' | 'counter'

export interface FreeBusyWindow {
  uri: string
  agent: string                  // DID
  start: string                  // datetime
  end: string                    // datetime
  slots: FreeBusySlot[]
  generated: string              // datetime
}

export interface FreeBusySlot {
  start: string
  end: string
  status: 'free' | 'busy' | 'tentative'
}

export interface CalendarMeta {
  id: string
  name: string
  color: string
  visible: boolean
}
```

### `lib/schemas.ts`

Shape definition JSON strings and a registration function. Shapes are registered on graph bootstrap.

```typescript
export const EVENT_SHAPE: ShapeDefinition = {
  targetClass: 'schema://Event',
  properties: [
    { path: 'schema://name', name: 'name', datatype: 'string', minCount: 1, maxCount: 1 },
    { path: 'schema://startDate', name: 'startDate', datatype: 'dateTime', minCount: 1, maxCount: 1 },
    { path: 'schema://endDate', name: 'endDate', datatype: 'dateTime', minCount: 1, maxCount: 1 },
    { path: 'schema://location', name: 'location', datatype: 'string', maxCount: 1 },
    { path: 'schema://description', name: 'description', datatype: 'string', maxCount: 1 },
    { path: 'schema://organizer', name: 'organizer', datatype: 'string', minCount: 1, maxCount: 1 },
    { path: 'schema://attendee', name: 'attendees', datatype: 'string' },
    { path: 'schema://eventStatus', name: 'status', datatype: 'string', maxCount: 1 },
    { path: 'schema://eventAttendanceMode', name: 'attendanceMode', datatype: 'string', maxCount: 1 },
    { path: 'schema://url', name: 'url', datatype: 'string', maxCount: 1 },
    { path: 'agenda://recurrence', name: 'recurrence', datatype: 'string', maxCount: 1 },
    { path: 'agenda://reminder', name: 'reminder', datatype: 'string', maxCount: 1 },
    { path: 'agenda://visibility', name: 'visibility', datatype: 'string', maxCount: 1 },
    { path: 'agenda://calendarId', name: 'calendarId', datatype: 'string', maxCount: 1 },
    { path: 'agenda://icsUid', name: 'icsUid', datatype: 'string', maxCount: 1 },
  ],
  constructor: [
    { action: 'addTriple', source: 'this', predicate: 'schema://name', target: 'name' },
    { action: 'addTriple', source: 'this', predicate: 'schema://startDate', target: 'startDate' },
    { action: 'addTriple', source: 'this', predicate: 'schema://endDate', target: 'endDate' },
    { action: 'addTriple', source: 'this', predicate: 'schema://organizer', target: 'organizer' },
  ],
}

export const MEETING_REQUEST_SHAPE: ShapeDefinition = { /* ... */ }
export const FREE_BUSY_SHAPE: ShapeDefinition = { /* ... */ }
```

### `lib/calendar-store.ts`

The core data layer. Owns the graph reference and exposes CRUD.

```typescript
export interface CalendarStore {
  /** Bootstrap: find or create the personal calendar graph, register shapes */
  init(): Promise<void>

  /** CRUD */
  createEvent(event: Omit<CalendarEvent, 'uri'>): Promise<CalendarEvent>
  getEvent(uri: string): Promise<CalendarEvent | null>
  updateEvent(uri: string, patch: Partial<CalendarEvent>): Promise<CalendarEvent>
  deleteEvent(uri: string): Promise<boolean>

  /** Queries */
  getEventsInRange(start: string, end: string): Promise<CalendarEvent[]>
  getEventsByCalendar(calendarId: string): Promise<CalendarEvent[]>

  /** Calendar management */
  getCalendars(): Promise<CalendarMeta[]>
  createCalendar(meta: Omit<CalendarMeta, 'id'>): Promise<CalendarMeta>
  updateCalendar(id: string, patch: Partial<CalendarMeta>): Promise<CalendarMeta>
  deleteCalendar(id: string): Promise<boolean>

  /** Reactive subscriptions */
  onEventChanged(callback: (event: CalendarEvent) => void): () => void
}
```

### `lib/query.ts`

Date-range query construction, occurrence expansion for recurring events.

### `lib/ics.ts`

ICS import/export using `ical.js`.

```typescript
export function parseICS(icsString: string): Omit<CalendarEvent, 'uri' | 'organizer'>[]
export function generateICS(events: CalendarEvent[]): string
export function eventToVEVENT(event: CalendarEvent): string
export function veventToEvent(vevent: ICAL.Event): Omit<CalendarEvent, 'uri' | 'organizer'>
```

### `lib/rrule.ts`

RRULE parsing and occurrence expansion for a given date window.

```typescript
export function parseRRule(rrule: string): RRuleOptions
export function expandOccurrences(rrule: string, dtstart: string, windowStart: string, windowEnd: string): string[]
```

### Layer 0 Tests

All tests use Vitest. The test environment provides a mock `navigator.graph` that implements the Living Web `PersonalGraph` interface in-memory (no AD4M executor needed for unit tests).

```
lib/__tests__/
├── calendar-store.test.ts
├── query.test.ts
├── ics.test.ts
├── rrule.test.ts
└── schemas.test.ts
```

#### `calendar-store.test.ts`

| # | Test | Level | Description |
|---|------|-------|-------------|
| S-01 | `init() MUST create a personal graph if none exists` | MUST | First call creates a graph named "My Calendar" via `navigator.graph.create()`. Second call finds and reuses the existing graph. |
| S-02 | `init() MUST register the Event shape on the graph` | MUST | After init, `graph.getShapes()` MUST include "Event". |
| S-03 | `init() MUST register the MeetingRequest shape` | MUST | After init, `graph.getShapes()` MUST include "MeetingRequest". |
| S-04 | `init() MUST register the FreeBusy shape` | MUST | After init, `graph.getShapes()` MUST include "FreeBusy". |
| S-05 | `createEvent() MUST create a shape instance with all required fields` | MUST | Created event MUST have name, startDate, endDate, organizer, calendarId, visibility, status. |
| S-06 | `createEvent() MUST generate a unique URI` | MUST | Two calls with identical data MUST produce different URIs. |
| S-07 | `createEvent() MUST reject when name is missing` | MUST | Omitting name MUST throw. |
| S-08 | `createEvent() MUST reject when startDate is missing` | MUST | Omitting startDate MUST throw. |
| S-09 | `createEvent() MUST reject when endDate is missing` | MUST | Omitting endDate MUST throw. |
| S-10 | `createEvent() MUST reject when endDate is before startDate` | MUST | endDate < startDate MUST throw a validation error. |
| S-11 | `createEvent() MUST default status to 'EventScheduled'` | MUST | If status is not provided, the stored event MUST have status `EventScheduled`. |
| S-12 | `createEvent() MUST default visibility to 'private'` | MUST | If visibility is not provided, the stored event MUST have visibility `private`. |
| S-13 | `getEvent() MUST return the event for a valid URI` | MUST | After createEvent, getEvent with the returned URI MUST return an identical event. |
| S-14 | `getEvent() MUST return null for an unknown URI` | MUST | getEvent with a non-existent URI MUST return null. |
| S-15 | `updateEvent() MUST modify only the specified fields` | MUST | Updating name MUST NOT change startDate, endDate, or other fields. |
| S-16 | `updateEvent() MUST reject endDate before startDate` | MUST | Updating endDate to a time before startDate MUST throw. |
| S-17 | `updateEvent() MUST return the updated event` | MUST | The returned event MUST reflect the applied changes. |
| S-18 | `deleteEvent() MUST remove the event from the graph` | MUST | After deletion, getEvent MUST return null. |
| S-19 | `deleteEvent() MUST return true for an existing event` | MUST | Deleting an event that exists MUST return true. |
| S-20 | `deleteEvent() MUST return false for a non-existent event` | MUST | Deleting a URI that doesn't exist MUST return false. |
| S-21 | `getEventsInRange() MUST return events overlapping the range` | MUST | Events that start before the range but end within it, events fully within the range, and events that start within but end after MUST all be returned. |
| S-22 | `getEventsInRange() MUST NOT return events outside the range` | MUST | Events ending before range start or starting after range end MUST NOT be returned. |
| S-23 | `getEventsInRange() MUST include recurring event occurrences` | MUST | A weekly recurring event MUST produce occurrences for each week within the range. |
| S-24 | `getEventsByCalendar() MUST filter by calendarId` | MUST | Events from other calendars MUST NOT be included. |
| S-25 | `onEventChanged() MUST fire when an event is created` | MUST | The callback MUST receive the new event. |
| S-26 | `onEventChanged() MUST fire when an event is updated` | MUST | The callback MUST receive the updated event. |
| S-27 | `onEventChanged() MUST fire when an event is deleted` | MUST | The callback MUST be notified of the deletion. |
| S-28 | `onEventChanged() MUST return an unsubscribe function` | MUST | Calling the returned function MUST stop future callbacks. |

#### `schemas.test.ts`

| # | Test | Level | Description |
|---|------|-------|-------------|
| SC-01 | `EVENT_SHAPE MUST have targetClass 'schema://Event'` | MUST | Shape definition targetClass MUST be `schema://Event`. |
| SC-02 | `EVENT_SHAPE MUST define name, startDate, endDate as required (minCount: 1)` | MUST | These three properties MUST have `minCount: 1`. |
| SC-03 | `EVENT_SHAPE MUST define organizer as required` | MUST | Organizer MUST have `minCount: 1`. |
| SC-04 | `EVENT_SHAPE MUST define attendees as a collection (no maxCount)` | MUST | The attendees property MUST NOT have a maxCount, allowing multiple values. |
| SC-05 | `EVENT_SHAPE properties MUST each have a valid predicate URI` | MUST | Every property path MUST be a `schema://` or `agenda://` URI. |
| SC-06 | `EVENT_SHAPE constructor MUST create triples for all required fields` | MUST | Constructor actions MUST cover name, startDate, endDate, organizer. |
| SC-07 | `MEETING_REQUEST_SHAPE MUST have targetClass 'agenda://MeetingRequest'` | MUST | Shape targetClass correct. |
| SC-08 | `FREE_BUSY_SHAPE MUST have targetClass 'agenda://FreeBusy'` | MUST | Shape targetClass correct. |

#### `ics.test.ts`

| # | Test | Level | Description |
|---|------|-------|-------------|
| I-01 | `parseICS() MUST extract SUMMARY as name` | MUST | ICS SUMMARY → event name. |
| I-02 | `parseICS() MUST extract DTSTART as startDate in ISO 8601` | MUST | Both date-only and datetime formats MUST be handled. |
| I-03 | `parseICS() MUST extract DTEND as endDate in ISO 8601` | MUST | Missing DTEND SHOULD default to startDate + 1 hour for datetime, or startDate + 1 day for date-only. |
| I-04 | `parseICS() MUST extract LOCATION as location` | MUST | Direct mapping. |
| I-05 | `parseICS() MUST extract DESCRIPTION as description` | MUST | Direct mapping. |
| I-06 | `parseICS() MUST extract RRULE as recurrence` | MUST | The raw RRULE string MUST be preserved. |
| I-07 | `parseICS() MUST extract UID as icsUid` | MUST | Enables round-trip sync with external calendars. |
| I-08 | `parseICS() MUST handle multiple VEVENT components` | MUST | An ICS file with N VEVENTs MUST produce N events. |
| I-09 | `parseICS() SHOULD handle VALARM as reminder` | SHOULD | The TRIGGER duration SHOULD be extracted as an ISO 8601 duration string. |
| I-10 | `parseICS() MUST ignore non-VEVENT components` | MUST | VTODO, VJOURNAL, VFREEBUSY MUST be skipped. |
| I-11 | `generateICS() MUST produce valid iCalendar output` | MUST | Output MUST begin with `BEGIN:VCALENDAR` and end with `END:VCALENDAR`. |
| I-12 | `generateICS() MUST include VCALENDAR PRODID and VERSION` | MUST | VERSION MUST be `2.0`. |
| I-13 | `generateICS() MUST map name → SUMMARY` | MUST | Reverse of I-01. |
| I-14 | `generateICS() MUST map startDate → DTSTART` | MUST | ISO 8601 → ICS datetime format. |
| I-15 | `generateICS() MUST map endDate → DTEND` | MUST | Reverse of I-03. |
| I-16 | `generateICS() MUST map recurrence → RRULE` | MUST | The RRULE string MUST be output as-is. |
| I-17 | `generateICS() MUST map icsUid → UID` | MUST | Preserves external identity for sync. |
| I-18 | `generateICS() MUST generate a UID if icsUid is absent` | MUST | Events without an external UID MUST still have a UID in the output. |
| I-19 | `parseICS() then generateICS() MUST round-trip core fields` | MUST | Parse → create events → generate → re-parse MUST produce equivalent events. |

#### `rrule.test.ts`

| # | Test | Level | Description |
|---|------|-------|-------------|
| R-01 | `parseRRule() MUST parse FREQ=DAILY` | MUST | Frequency extraction. |
| R-02 | `parseRRule() MUST parse FREQ=WEEKLY with BYDAY` | MUST | e.g. `FREQ=WEEKLY;BYDAY=MO,WE,FR`. |
| R-03 | `parseRRule() MUST parse FREQ=MONTHLY` | MUST | Monthly recurrence. |
| R-04 | `parseRRule() MUST parse FREQ=YEARLY` | MUST | Yearly recurrence. |
| R-05 | `parseRRule() MUST parse INTERVAL` | MUST | e.g. `INTERVAL=2` for every other week. |
| R-06 | `parseRRule() MUST parse COUNT` | MUST | Limit total occurrences. |
| R-07 | `parseRRule() MUST parse UNTIL` | MUST | End date for recurrence. |
| R-08 | `expandOccurrences() MUST generate correct dates for daily` | MUST | 7-day window with FREQ=DAILY MUST produce 7 occurrences. |
| R-09 | `expandOccurrences() MUST generate correct dates for weekly with BYDAY` | MUST | 2-week window with BYDAY=MO,WE MUST produce 4 occurrences. |
| R-10 | `expandOccurrences() MUST respect COUNT limit` | MUST | FREQ=DAILY;COUNT=3 MUST produce at most 3 occurrences. |
| R-11 | `expandOccurrences() MUST respect UNTIL limit` | MUST | Occurrences after UNTIL date MUST NOT be generated. |
| R-12 | `expandOccurrences() MUST NOT generate occurrences outside the query window` | MUST | Occurrences before windowStart or after windowEnd MUST NOT be returned. |
| R-13 | `expandOccurrences() MUST handle timezone offsets in DTSTART` | MUST | A DTSTART with `+10:00` MUST produce occurrences in the correct absolute times. |
| R-14 | `expandOccurrences() SHOULD handle EXDATE (exception dates)` | SHOULD | If EXDATE support is implemented, those dates MUST be excluded. |

#### `query.test.ts`

| # | Test | Level | Description |
|---|------|-------|-------------|
| Q-01 | `buildDateRangeQuery() MUST produce a query matching events overlapping the range` | MUST | Events where `startDate < rangeEnd AND endDate > rangeStart`. |
| Q-02 | `buildDateRangeQuery() MUST handle single-day ranges` | MUST | Range where start = end (same day) MUST match events on that day. |
| Q-03 | `resolveRecurringEvents() MUST expand RRULE occurrences into the query window` | MUST | A weekly event MUST produce individual occurrences for display. |
| Q-04 | `resolveRecurringEvents() MUST preserve the original event URI on expanded occurrences` | MUST | Occurrences MUST reference the parent event so edits apply to the series. |
| Q-05 | `resolveRecurringEvents() MUST adjust startDate and endDate for each occurrence` | MUST | Each occurrence MUST have its own correct start/end times. |

---

## Layer 1: Personal Calendar UI

SolidJS components rendering the data from Layer 0. No networking, no sharing — one person, one calendar.

### View State

```typescript
export type ViewMode = 'day' | 'week' | 'month' | 'agenda'

export interface ViewState {
  mode: ViewMode
  selectedDate: string           // ISO 8601 date (YYYY-MM-DD)
  visibleRange: { start: string; end: string }
  visibleCalendars: Set<string>  // calendar IDs
}
```

### Layer 1 Tests

E2E tests (Playwright) against the running app with a mock graph backend.

```
tests/
├── views.spec.ts
├── events.spec.ts
├── calendar-management.spec.ts
└── ics-import.spec.ts
```

#### `views.spec.ts`

| # | Test | Level | Description |
|---|------|-------|-------------|
| V-01 | `Week view MUST render 7 day columns` | MUST | The default view MUST show 7 columns for Mon–Sun (or Sun–Sat depending on locale). |
| V-02 | `Week view MUST render hour slots from 00:00 to 23:00` | MUST | 24 hour labels MUST be visible when scrolling. |
| V-03 | `Day view MUST render a single day column` | MUST | Switching to day view MUST show one column. |
| V-04 | `Month view MUST render a calendar grid` | MUST | The grid MUST show 4–6 weeks of days. |
| V-05 | `Agenda view MUST render a chronological event list` | MUST | Events MUST appear in time order, oldest first. |
| V-06 | `View toggle MUST switch between all four views` | MUST | Clicking day/week/month/agenda buttons MUST change the rendered view. |
| V-07 | `Today button MUST navigate to the current date` | MUST | After navigating away, clicking "Today" MUST return to today's date. |
| V-08 | `Navigation arrows MUST move forward/backward by one unit` | MUST | In week view, forward arrow MUST advance by 7 days. In month view, by one month. |
| V-09 | `Selected date MUST be visually highlighted` | MUST | The current/selected day MUST have a distinct visual indicator. |

#### `events.spec.ts`

| # | Test | Level | Description |
|---|------|-------|-------------|
| E-01 | `Clicking an empty time slot MUST open the quick-create popover` | MUST | The popover MUST pre-fill the clicked time. |
| E-02 | `Quick-create MUST create an event with name and time` | MUST | Typing a name and confirming MUST create an event visible on the grid. |
| E-03 | `Clicking an event block MUST open the event detail panel` | MUST | The detail panel MUST show all event fields. |
| E-04 | `Event detail panel MUST allow editing all fields` | MUST | Name, time, location, description, calendar, visibility MUST all be editable. |
| E-05 | `Saving changes in event detail MUST update the event on the grid` | MUST | The grid MUST reflect the new name/time immediately. |
| E-06 | `Deleting an event MUST remove it from the grid` | MUST | After confirmation, the event block MUST disappear. |
| E-07 | `Events MUST be positioned by startDate/endDate on the time grid` | MUST | A 10:00–11:00 event MUST be positioned at the 10am row and span 1 hour. |
| E-08 | `Events MUST be colored by calendar` | MUST | Events from different calendars MUST have different background colors. |
| E-09 | `Dragging an event SHOULD move it to a new time slot` | SHOULD | Drag-and-drop SHOULD update startDate/endDate. |
| E-10 | `Resizing an event SHOULD change its duration` | SHOULD | Dragging the bottom edge SHOULD update endDate. |
| E-11 | `Events with recurrence MUST display each occurrence in the visible range` | MUST | A weekly event MUST show on each week in a month view. |

#### `calendar-management.spec.ts`

| # | Test | Level | Description |
|---|------|-------|-------------|
| C-01 | `Sidebar MUST list all calendars` | MUST | Personal calendar MUST appear on first run. |
| C-02 | `Creating a new calendar MUST add it to the sidebar` | MUST | New calendar with name and color MUST appear immediately. |
| C-03 | `Toggling calendar visibility MUST show/hide its events` | MUST | Unchecking a calendar MUST remove its events from the grid. Re-checking MUST restore them. |
| C-04 | `Calendar color MUST be reflected on event blocks` | MUST | Changing a calendar's color MUST update all its events' colors. |

#### `ics-import.spec.ts`

| # | Test | Level | Description |
|---|------|-------|-------------|
| IC-01 | `Dropping an .ics file on the app MUST trigger import` | MUST | Drag-and-drop of a valid ICS file MUST parse and create events. |
| IC-02 | `Import MUST create events for each VEVENT in the file` | MUST | A file with 5 VEVENTs MUST produce 5 events. |
| IC-03 | `Imported events MUST appear on the calendar grid` | MUST | After import, events MUST be visible at their correct times. |
| IC-04 | `Import MUST reject invalid ICS files with an error message` | MUST | A non-ICS file MUST show an error, not silently fail. |

---

## Layer 2: Person-to-Person Scheduling

Peer-to-peer meeting negotiation via shared graphs.

### `scheduling/meeting-request.ts`

```typescript
export interface MeetingRequestService {
  /** Create a meeting request → creates a shared graph with the invitee */
  sendRequest(event: CalendarEvent, toDid: string): Promise<MeetingRequest>

  /** Accept a pending request → update shared graph, add event to personal calendar */
  acceptRequest(request: MeetingRequest): Promise<CalendarEvent>

  /** Decline a pending request */
  declineRequest(request: MeetingRequest): Promise<void>

  /** Counter-propose with alternative times */
  counterPropose(request: MeetingRequest, newStart: string, newEnd: string, message?: string): Promise<MeetingRequest>

  /** List all pending incoming requests */
  getIncomingRequests(): Promise<MeetingRequest[]>

  /** List all pending outgoing requests */
  getOutgoingRequests(): Promise<MeetingRequest[]>

  /** Subscribe to incoming request events */
  onRequestReceived(callback: (request: MeetingRequest) => void): () => void
}
```

### Layer 2 Tests

```
lib/__tests__/meeting-request.test.ts
tests/scheduling.spec.ts
```

#### `meeting-request.test.ts`

| # | Test | Level | Description |
|---|------|-------|-------------|
| M-01 | `sendRequest() MUST create a shared graph for the meeting` | MUST | A shared graph MUST be created via `graph.share()` containing the MeetingRequest. |
| M-02 | `sendRequest() MUST create a MeetingRequest instance with status 'pending'` | MUST | The shared graph MUST contain a MeetingRequest with status `pending`. |
| M-03 | `sendRequest() MUST set 'from' to the organizer's DID` | MUST | The `from` field MUST match the current user's DID. |
| M-04 | `sendRequest() MUST set 'to' to the invitee's DID` | MUST | The `to` field MUST be the specified DID. |
| M-05 | `acceptRequest() MUST update the request status to 'accepted'` | MUST | After accepting, the shared graph's MeetingRequest MUST have status `accepted`. |
| M-06 | `acceptRequest() MUST add the event to the acceptor's personal calendar` | MUST | The accepted event MUST appear in the personal calendar graph. |
| M-07 | `declineRequest() MUST update the request status to 'declined'` | MUST | After declining, the shared graph's MeetingRequest MUST have status `declined`. |
| M-08 | `counterPropose() MUST update status to 'counter' with new times` | MUST | The counter-proposal MUST include counterStart and counterEnd. |
| M-09 | `counterPropose() MAY include a message` | MAY | If provided, the message MUST be stored on the MeetingRequest. |
| M-10 | `getIncomingRequests() MUST return requests where 'to' matches current DID` | MUST | Only requests addressed to the current user MUST be returned. |
| M-11 | `getOutgoingRequests() MUST return requests where 'from' matches current DID` | MUST | Only requests sent by the current user MUST be returned. |

---

## Layer 3: Free/Busy & Availability

### `availability/freebusy.ts`

```typescript
export interface FreeBusyService {
  /** Generate a FreeBusy window from local events (strips details, keeps time slots) */
  generateFreeBusy(start: string, end: string, calendarIds?: string[]): Promise<FreeBusyWindow>

  /** Publish FreeBusy to a shared graph (so invitees can see availability) */
  publishFreeBusy(sharedGraphUuid: string, window: FreeBusyWindow): Promise<void>

  /** Fetch remote FreeBusy from a shared graph */
  getRemoteFreeBusy(sharedGraphUuid: string, agentDid: string): Promise<FreeBusyWindow | null>
}
```

### `availability/slot-finder.ts`

```typescript
export interface SlotFinderService {
  /** Find the first mutually free slot of a given duration for all participants */
  findFreeSlot(
    participants: FreeBusyWindow[],
    duration: number,           // minutes
    searchStart: string,
    searchEnd: string,
  ): { start: string; end: string } | null
}
```

### Layer 3 Tests

```
lib/__tests__/freebusy.test.ts
lib/__tests__/slot-finder.test.ts
```

#### `freebusy.test.ts`

| # | Test | Level | Description |
|---|------|-------|-------------|
| F-01 | `generateFreeBusy() MUST produce slots for the specified window` | MUST | The returned FreeBusyWindow MUST cover start to end. |
| F-02 | `generateFreeBusy() MUST mark time occupied by events as 'busy'` | MUST | Slots overlapping existing events MUST have status `busy`. |
| F-03 | `generateFreeBusy() MUST mark unoccupied time as 'free'` | MUST | Slots not overlapping any event MUST have status `free`. |
| F-04 | `generateFreeBusy() MUST NOT reveal event details` | MUST | The output MUST contain only time slots and status — no event names, descriptions, or locations. |
| F-05 | `generateFreeBusy() MUST respect event visibility` | MUST | Events with visibility `private` MUST still generate `busy` slots. Events with visibility `public` MUST still only produce time-slot data (no details in FreeBusy). |
| F-06 | `generateFreeBusy() MUST include recurring event occurrences` | MUST | A weekly recurring event MUST produce `busy` slots for each occurrence in the window. |
| F-07 | `publishFreeBusy() MUST create a FreeBusy shape instance in the shared graph` | MUST | The shared graph MUST contain a FreeBusy instance matching the generated window. |

#### `slot-finder.test.ts`

| # | Test | Level | Description |
|---|------|-------|-------------|
| SF-01 | `findFreeSlot() MUST return a slot where all participants are free` | MUST | The returned slot MUST NOT overlap any participant's busy time. |
| SF-02 | `findFreeSlot() MUST return the earliest possible slot` | MUST | If multiple slots exist, the one closest to searchStart MUST be returned. |
| SF-03 | `findFreeSlot() MUST return null when no slot exists` | MUST | If all time in the search window is occupied, null MUST be returned. |
| SF-04 | `findFreeSlot() MUST respect the requested duration` | MUST | The returned slot's duration MUST be ≥ the requested duration. |
| SF-05 | `findFreeSlot() MUST handle participants in different time zones` | MUST | Free/busy times MUST be compared in absolute UTC, regardless of local representation. |

---

## Layer 4: Shared Calendars

### `shared/shared-calendar.ts`

```typescript
export interface SharedCalendarService {
  /** Create a shared calendar → creates a shared graph with Event shape */
  createSharedCalendar(name: string, color: string): Promise<{ graphUuid: string; shareUrl: string }>

  /** Join an existing shared calendar by URL */
  joinSharedCalendar(url: string): Promise<{ graphUuid: string; name: string }>

  /** Leave a shared calendar */
  leaveSharedCalendar(graphUuid: string, retainLocalCopy?: boolean): Promise<void>

  /** List shared calendars the user belongs to */
  listSharedCalendars(): Promise<Array<{ graphUuid: string; name: string; shareUrl: string }>>

  /** Get events from a shared calendar */
  getSharedEvents(graphUuid: string, start: string, end: string): Promise<CalendarEvent[]>

  /** Create an event in a shared calendar */
  createSharedEvent(graphUuid: string, event: Omit<CalendarEvent, 'uri'>): Promise<CalendarEvent>
}
```

### `shared/governance.ts`

```typescript
export interface CalendarGovernance {
  /** Grant a role to a DID on a shared calendar */
  grantRole(graphUuid: string, did: string, role: 'admin' | 'editor' | 'viewer'): Promise<void>

  /** Revoke a role from a DID */
  revokeRole(graphUuid: string, did: string, role: string): Promise<void>

  /** Check if a DID has a specific permission */
  canPerform(graphUuid: string, did: string, action: 'create' | 'edit' | 'delete'): Promise<boolean>

  /** List members and their roles */
  listMembers(graphUuid: string): Promise<Array<{ did: string; roles: string[] }>>
}
```

### Layer 4 Tests

```
lib/__tests__/shared-calendar.test.ts
lib/__tests__/governance.test.ts
```

#### `shared-calendar.test.ts`

| # | Test | Level | Description |
|---|------|-------|-------------|
| SH-01 | `createSharedCalendar() MUST create a shared graph with Event shape` | MUST | The shared graph MUST have the Event shape registered. |
| SH-02 | `createSharedCalendar() MUST return a share URL` | MUST | The returned shareUrl MUST be usable with `joinSharedCalendar()`. |
| SH-03 | `joinSharedCalendar() MUST create a local perspective linked to the shared graph` | MUST | After joining, events in the shared graph MUST be queryable locally. |
| SH-04 | `createSharedEvent() MUST be visible to all members` | MUST | An event created by member A MUST be queryable by member B. |
| SH-05 | `leaveSharedCalendar() MUST remove the local perspective` | MUST | After leaving, the shared calendar MUST NOT appear in `listSharedCalendars()`. |
| SH-06 | `leaveSharedCalendar({ retainLocalCopy: true }) MUST keep a local read-only copy` | MUST | Events MUST still be queryable but new sync updates MUST NOT arrive. |

#### `governance.test.ts`

| # | Test | Level | Description |
|---|------|-------|-------------|
| G-01 | `Admin role MUST allow create, edit, and delete` | MUST | `canPerform()` for all three actions MUST return true for admins. |
| G-02 | `Editor role MUST allow create and edit but NOT delete` | MUST | Editors MUST be able to create/edit but `canPerform('delete')` MUST return false. |
| G-03 | `Viewer role MUST NOT allow create, edit, or delete` | MUST | All three `canPerform()` calls MUST return false for viewers. |
| G-04 | `grantRole() MUST be callable only by admins` | MUST | A non-admin attempting to grant roles MUST be rejected. |
| G-05 | `Calendar creator MUST automatically receive admin role` | MUST | After `createSharedCalendar()`, the creator's DID MUST have the admin role. |

---

## Layer 5: Adoption & Onboarding

### `interop/import-wizard.ts`

```typescript
export interface ImportWizard {
  /** Import events from an ICS file */
  importICSFile(file: File, targetCalendarId: string): Promise<{ imported: number; skipped: number }>

  /** Import from Google Calendar export (Takeout ZIP) */
  importGoogleTakeout(file: File): Promise<{ imported: number; calendars: number }>
}
```

### `interop/natural-language.ts`

```typescript
export interface NaturalLanguageParser {
  /** Parse a quick-add string into event fields */
  parse(input: string, referenceDate?: string): Partial<CalendarEvent> | null
}
```

### Layer 5 Tests

```
lib/__tests__/natural-language.test.ts
```

#### `natural-language.test.ts`

| # | Test | Level | Description |
|---|------|-------|-------------|
| NL-01 | `"Coffee tomorrow at 10am" MUST parse name and startDate` | MUST | Name MUST be "Coffee", startDate MUST be tomorrow at 10:00. |
| NL-02 | `"Meeting with Nico 3pm-4pm Friday" MUST parse name, start, and end` | MUST | Name MUST be "Meeting with Nico", times MUST be correct for the coming Friday. |
| NL-03 | `"Dentist next Tuesday" MUST parse name and date` | MUST | Date MUST resolve to the next Tuesday from the reference date. |
| NL-04 | `Unparseable input MUST return null` | MUST | Random strings with no time/date signals MUST return null, not throw. |
| NL-05 | `"Weekly standup every Monday 9am" SHOULD parse recurrence` | SHOULD | If supported, the result SHOULD include an RRULE-compatible recurrence string. |

---

## Test Infrastructure

### Mock Graph Backend

A lightweight in-memory implementation of the Living Web `PersonalGraph` / `PersonalGraphManager` interface, used by unit tests. This avoids the need for a running AD4M executor during development and CI.

```typescript
// lib/__tests__/helpers/mock-graph.ts
export class MockPersonalGraph extends EventTarget {
  private triples: Map<string, SignedTriple> = new Map()
  private shapes: Map<string, ShapeDefinition> = new Map()
  readonly uuid: string
  readonly name: string | null

  async addTriple(triple: SemanticTriple): Promise<SignedTriple> { /* ... */ }
  async removeTriple(signed: SignedTriple): Promise<boolean> { /* ... */ }
  async queryTriples(query: TripleQuery): Promise<SignedTriple[]> { /* ... */ }
  async addShape(name: string, json: string): Promise<void> { /* ... */ }
  async createShapeInstance(name: string, addr: string, params?: Record<string, unknown>): Promise<string> { /* ... */ }
  // ... etc
}

export class MockGraphManager {
  async create(name?: string): Promise<MockPersonalGraph> { /* ... */ }
  async list(): Promise<MockPersonalGraph[]> { /* ... */ }
  async get(uuid: string): Promise<MockPersonalGraph | null> { /* ... */ }
  async remove(uuid: string): Promise<boolean> { /* ... */ }
}
```

### Integration Tests

For full-stack integration testing against a real AD4M executor, a separate test config points the polyfill at a running executor. These are **not** run in CI — they're a manual verification step.

---

## Implementation Order

1. **Layer 0** — Data foundation. No UI. All unit tests passing.
2. **Layer 1** — UI on top of Layer 0. E2E tests for views, events, calendar management.
3. **Layer 2** — Meeting requests. Unit + E2E.
4. **Layer 3** — Free/busy. Unit tests.
5. **Layer 4** — Shared calendars. Unit tests.
6. **Layer 5** — Onboarding. Natural language parser unit tests.

Each layer is a clean milestone. No layer starts until the previous one's tests are green.
