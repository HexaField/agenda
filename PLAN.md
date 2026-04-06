# Agenda: Implementation Plan

**Sovereign calendar on the Living Web, backed by AD4M.**

---

## Design Principles

**Data-driven and declarative.** The shape definitions are the single source of truth. Types, validation, queries, ICS mapping, form generation, and governance rules are all *derived* from the shapes — never duplicated in parallel code. If you change a shape, everything downstream updates automatically.

1. **Shapes are the schema.** The Living Web shape definitions (`EVENT_SHAPE`, `MEETING_REQUEST_SHAPE`, `FREE_BUSY_SHAPE`) declare every property, its type, cardinality, and predicate path. Application-level TypeScript types are *generated* from shapes, not maintained by hand.
2. **Mappings are data.** ICS field mapping, form field rendering hints, predicate URIs — all declared as lookup tables keyed by shape property name. No per-field functions.
3. **Queries are derived.** Date-range queries, instance lookups, and calendar filtering are composed from shape metadata + parameters. Not hand-written SPARQL per use case.
4. **UI is shape-driven.** Event detail forms are rendered by iterating shape properties, not by hand-coding a field per property. Rendering hints (input type, display order, grouping) are annotations on the shape, not in component code.
5. **Operations are generic.** `createInstance`, `updateInstance`, `deleteInstance` work on *any* shape. Calendar-specific logic (defaults, validation rules like endDate > startDate) is expressed as declarative rules attached to the shape, not as method bodies.
6. **Pipelines, not procedures.** Data flows through declarative transformation pipelines: `shape → query → graph → instances → expand recurrences → filter visible calendars → render`. Each stage is a pure function of its inputs.

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `@living-web/ad4m-polyfill` | `navigator.graph` + `navigator.credentials` backed by AD4M executor |
| `solid-js` | Reactive UI framework |
| `tailwindcss` | Styling |
| `ical.js` | ICS parsing/generation (VEVENT, RRULE, VALARM) |

---

## Package Structure

```
packages/client/
├── src/
│   ├── index.tsx                          # App mount
│   ├── index.css                          # Tailwind + base styles
│   ├── App.tsx                            # Root: bootstrap graph, provide context
│   │
│   ├── data/                              # Layer 0 — Declarative Data Foundation
│   │   ├── shapes/                        # Shape definitions (the single source of truth)
│   │   │   ├── event.ts                   # EVENT_SHAPE definition + annotations
│   │   │   ├── meeting-request.ts         # MEETING_REQUEST_SHAPE definition + annotations
│   │   │   ├── freebusy.ts               # FREE_BUSY_SHAPE definition + annotations
│   │   │   ├── calendar-meta.ts           # CALENDAR_META_SHAPE definition + annotations
│   │   │   └── index.ts                   # Shape registry (all shapes, lookup by name)
│   │   │
│   │   ├── engine/                        # Generic, shape-agnostic graph operations
│   │   │   ├── graph-context.ts           # Bootstrap graph, register shapes, provide to app
│   │   │   ├── instance-ops.ts            # Generic CRUD: create/get/update/delete any shape instance
│   │   │   ├── query-builder.ts           # Build queries from shape metadata + filter params
│   │   │   └── subscriptions.ts           # Generic event listeners on graph changes
│   │   │
│   │   ├── derivations/                   # Shape-derived utilities (all take shape as input)
│   │   │   ├── type-gen.ts                # Derive TypeScript types/validators from shape properties
│   │   │   ├── defaults.ts                # Declarative default-value rules per shape
│   │   │   ├── validation-rules.ts        # Declarative validation rules (e.g. endDate > startDate)
│   │   │   └── ics-mapping.ts             # ICS ↔ shape field mapping table
│   │   │
│   │   ├── transforms/                    # Pure data transformation pipelines
│   │   │   ├── ics.ts                     # ICS import/export (driven by ics-mapping table)
│   │   │   ├── rrule.ts                   # RRULE parsing + occurrence expansion
│   │   │   ├── freebusy-gen.ts            # Events → FreeBusy slots (pure projection)
│   │   │   └── slot-finder.ts             # FreeBusy windows → mutual free slots
│   │   │
│   │   └── pipelines/                     # Composed query + transform chains
│   │       ├── visible-events.ts          # shape → query → instances → expand rrule → filter calendars
│   │       └── availability.ts            # events → freebusy → publish / overlay
│   │
│   ├── ui/                                # Layer 1 — Personal Calendar UI
│   │   ├── Shell.tsx                      # App shell: sidebar + main + header
│   │   ├── Header.tsx                     # View toggle, today, navigation
│   │   ├── Sidebar.tsx                    # Calendar list, visibility toggles
│   │   ├── views/
│   │   │   ├── ViewRouter.tsx             # Declarative view selection by ViewMode
│   │   │   ├── WeekView.tsx               # 7-column time grid
│   │   │   ├── DayView.tsx                # Single-column time grid
│   │   │   ├── MonthView.tsx              # Month grid
│   │   │   └── AgendaView.tsx             # Chronological list
│   │   ├── events/
│   │   │   ├── EventBlock.tsx             # Positioned event on grid
│   │   │   ├── EventDetail.tsx            # Shape-driven editor (iterates shape properties)
│   │   │   ├── QuickCreate.tsx            # Click-to-create popover
│   │   │   └── EventDrag.tsx              # Drag/resize logic
│   │   ├── forms/                         # Generic shape-driven form components
│   │   │   ├── ShapeForm.tsx              # Renders a form from any shape definition + annotations
│   │   │   ├── FieldRenderer.tsx          # Dispatches to input type by shape property datatype
│   │   │   └── field-registry.ts          # Maps datatype → input component (declarative)
│   │   ├── components/
│   │   │   ├── TimeGrid.tsx               # Shared hour-slot grid
│   │   │   ├── DatePicker.tsx             # Mini calendar
│   │   │   ├── TimePicker.tsx             # Time input
│   │   │   └── CalendarChip.tsx           # Colored label
│   │   └── state/
│   │       ├── view-state.ts              # Current view, date, range (SolidJS store)
│   │       ├── calendar-state.ts          # Visible calendars, calendar metadata (SolidJS store)
│   │       └── event-state.ts             # Reactive query results (derived from view-state + graph)
│   │
│   ├── scheduling/                        # Layer 2 — Person-to-Person Scheduling
│   │   ├── invite-flow.ts                 # Declarative flow: event+attendee → shared graph → MeetingRequest
│   │   ├── request-transitions.ts         # State machine: pending → accepted/declined/counter
│   │   ├── InvitePanel.tsx                # Incoming/outgoing request list
│   │   └── ContactPicker.tsx              # DID search
│   │
│   ├── shared/                            # Layer 4 — Shared Calendars
│   │   ├── shared-calendar-ops.ts         # Create/join/leave (delegates to graph.share/join)
│   │   ├── governance-rules.ts            # Declarative role→permission mapping table
│   │   └── SharedCalendarSettings.tsx     # Membership + role management UI
│   │
│   └── onboarding/                        # Layer 5 — Adoption
│       ├── import-wizard.ts               # ICS file → ics-mapping → createInstance pipeline
│       ├── natural-language.ts            # Quick-add string → partial event fields
│       └── WelcomeWizard.tsx              # First-run UI
│
├── tests/
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Layer 0: Declarative Data Foundation

### Shape Definitions (the source of truth)

Each shape is a JSON definition with **annotations** — metadata that drives UI rendering, ICS mapping, validation, and default values. Annotations are *not* part of the Living Web shape spec — they are an Agenda-level extension stored alongside the definition.

#### `data/shapes/event.ts`

```typescript
import type { ShapeDefinition } from '../engine/types'
import type { ShapeAnnotations } from '../derivations/types'

/** The Living Web shape — pure spec-level definition */
export const EVENT_SHAPE: ShapeDefinition = {
  targetClass: 'schema://Event',
  properties: [
    { path: 'schema://name',                    name: 'name',           datatype: 'string',   minCount: 1, maxCount: 1 },
    { path: 'schema://startDate',               name: 'startDate',      datatype: 'dateTime', minCount: 1, maxCount: 1 },
    { path: 'schema://endDate',                 name: 'endDate',        datatype: 'dateTime', minCount: 1, maxCount: 1 },
    { path: 'schema://location',                name: 'location',       datatype: 'string',               maxCount: 1 },
    { path: 'schema://description',             name: 'description',    datatype: 'string',               maxCount: 1 },
    { path: 'schema://organizer',               name: 'organizer',      datatype: 'string',   minCount: 1, maxCount: 1 },
    { path: 'schema://attendee',                name: 'attendees',      datatype: 'string'                             },
    { path: 'schema://eventStatus',             name: 'status',         datatype: 'string',               maxCount: 1 },
    { path: 'schema://eventAttendanceMode',     name: 'attendanceMode', datatype: 'string',               maxCount: 1 },
    { path: 'schema://url',                     name: 'url',            datatype: 'string',               maxCount: 1 },
    { path: 'agenda://recurrence',              name: 'recurrence',     datatype: 'string',               maxCount: 1 },
    { path: 'agenda://reminder',                name: 'reminder',       datatype: 'string',               maxCount: 1 },
    { path: 'agenda://visibility',              name: 'visibility',     datatype: 'string',               maxCount: 1 },
    { path: 'agenda://calendarId',              name: 'calendarId',     datatype: 'string',               maxCount: 1 },
    { path: 'agenda://icsUid',                  name: 'icsUid',         datatype: 'string',               maxCount: 1 },
  ],
  constructor: [
    { action: 'addTriple', source: 'this', predicate: 'schema://name',      target: 'name' },
    { action: 'addTriple', source: 'this', predicate: 'schema://startDate', target: 'startDate' },
    { action: 'addTriple', source: 'this', predicate: 'schema://endDate',   target: 'endDate' },
    { action: 'addTriple', source: 'this', predicate: 'schema://organizer', target: 'organizer' },
  ],
}

/** Agenda-level annotations — drives UI, validation, defaults, ICS mapping */
export const EVENT_ANNOTATIONS: ShapeAnnotations = {
  /** Display metadata per property */
  fields: {
    name:           { label: 'Title',       inputType: 'text',     group: 'primary', order: 0 },
    startDate:      { label: 'Start',       inputType: 'datetime', group: 'primary', order: 1 },
    endDate:        { label: 'End',         inputType: 'datetime', group: 'primary', order: 2 },
    location:       { label: 'Location',    inputType: 'text',     group: 'details', order: 3 },
    description:    { label: 'Description', inputType: 'textarea', group: 'details', order: 4 },
    organizer:      { label: 'Organizer',   inputType: 'hidden',   group: 'system',  order: -1 },
    attendees:      { label: 'Attendees',   inputType: 'did-list', group: 'people',  order: 5 },
    status:         { label: 'Status',      inputType: 'select',   group: 'details', order: 6,
                      options: ['EventScheduled', 'EventCancelled', 'EventPostponed', 'EventRescheduled'] },
    attendanceMode: { label: 'Attendance',  inputType: 'select',   group: 'details', order: 7,
                      options: ['OnlineEventAttendanceMode', 'OfflineEventAttendanceMode', 'MixedEventAttendanceMode'] },
    url:            { label: 'URL',         inputType: 'url',      group: 'details', order: 8 },
    recurrence:     { label: 'Repeat',      inputType: 'rrule',    group: 'details', order: 9 },
    reminder:       { label: 'Reminder',    inputType: 'duration', group: 'details', order: 10 },
    visibility:     { label: 'Visibility',  inputType: 'select',   group: 'details', order: 11,
                      options: ['private', 'busy', 'public'] },
    calendarId:     { label: 'Calendar',    inputType: 'calendar-select', group: 'primary', order: 12 },
    icsUid:         { label: 'ICS UID',     inputType: 'hidden',   group: 'system',  order: -1 },
  },

  /** Declarative default values (applied when creating a new instance) */
  defaults: {
    status: 'EventScheduled',
    visibility: 'private',
    // organizer: derived from navigator.credentials at runtime
  },

  /** Declarative validation rules (beyond what the shape's cardinality enforces) */
  rules: [
    { type: 'comparison', field: 'endDate', operator: '>', referenceField: 'startDate',
      message: 'End date must be after start date' },
  ],

  /** ICS field mapping — bidirectional, keyed by shape property name */
  icsMapping: {
    name:        'SUMMARY',
    startDate:   'DTSTART',
    endDate:     'DTEND',
    location:    'LOCATION',
    description: 'DESCRIPTION',
    organizer:   'ORGANIZER',
    attendees:   'ATTENDEE',
    status:      'STATUS',
    recurrence:  'RRULE',
    icsUid:      'UID',
    reminder:    'VALARM.TRIGGER',
  },
}
```

#### Annotation Types

```typescript
/** data/derivations/types.ts */

export interface ShapeAnnotations {
  fields: Record<string, FieldAnnotation>
  defaults: Record<string, string | number | boolean>
  rules: ValidationRule[]
  icsMapping?: Record<string, string>     // shape property name → ICS property name
}

export interface FieldAnnotation {
  label: string
  inputType: InputType
  group: string                            // for grouping in UI (primary, details, people, system)
  order: number                            // display order within group
  options?: string[]                       // for select inputs
  hidden?: boolean                         // hidden from user-facing forms
}

export type InputType =
  | 'text' | 'textarea' | 'url'            // string inputs
  | 'datetime' | 'date' | 'time'           // temporal inputs
  | 'duration'                              // ISO 8601 duration picker
  | 'select'                                // enum dropdown
  | 'rrule'                                 // recurrence rule builder
  | 'did-list'                              // multi-DID selector
  | 'calendar-select'                       // calendar chooser
  | 'hidden'                                // not rendered

export interface ValidationRule {
  type: 'comparison' | 'pattern' | 'custom'
  field: string
  operator?: '>' | '<' | '>=' | '<=' | '==' | '!='
  referenceField?: string                  // for cross-field comparison
  pattern?: string                         // for regex validation
  message: string
}
```

#### Shape Registry

```typescript
/** data/shapes/index.ts */

export interface RegisteredShape {
  shape: ShapeDefinition
  annotations: ShapeAnnotations
}

/** All shapes, keyed by name. The engine registers these on graph bootstrap. */
export const SHAPE_REGISTRY: Record<string, RegisteredShape> = {
  Event:          { shape: EVENT_SHAPE,            annotations: EVENT_ANNOTATIONS },
  MeetingRequest: { shape: MEETING_REQUEST_SHAPE,  annotations: MEETING_REQUEST_ANNOTATIONS },
  FreeBusy:       { shape: FREE_BUSY_SHAPE,        annotations: FREE_BUSY_ANNOTATIONS },
  CalendarMeta:   { shape: CALENDAR_META_SHAPE,    annotations: CALENDAR_META_ANNOTATIONS },
}
```

### Generic Engine

Shape-agnostic operations. These work on *any* registered shape.

#### `data/engine/instance-ops.ts`

```typescript
/**
 * Generic, shape-driven CRUD. No shape-specific code — operates
 * on any shape from the registry using its definition + annotations.
 */

export interface InstanceOps {
  /**
   * Create an instance of a shape.
   * 1. Look up shape in registry
   * 2. Apply declarative defaults from annotations
   * 3. Run declarative validation rules
   * 4. Generate URI (urn:<shape>:<uuid>)
   * 5. Call graph.createShapeInstance()
   */
  create(shapeName: string, data: Record<string, unknown>): Promise<Record<string, unknown>>

  /** Get instance data by URI */
  get(shapeName: string, uri: string): Promise<Record<string, unknown> | null>

  /**
   * Update instance properties.
   * 1. For each key in patch: call graph.setShapeProperty() or collection ops
   * 2. Re-validate after patch (run rules against merged data)
   */
  update(shapeName: string, uri: string, patch: Record<string, unknown>): Promise<Record<string, unknown>>

  /** Delete an instance (remove all its triples) */
  delete(shapeName: string, uri: string): Promise<boolean>

  /** Query instances by filter parameters, derived from shape metadata */
  query(shapeName: string, filters: QueryFilters): Promise<Record<string, unknown>[]>
}

export interface QueryFilters {
  /** Property equality filters — keys are shape property names */
  where?: Record<string, string | string[]>
  /** Temporal range filter (for properties with datatype 'dateTime') */
  dateRange?: { property: string; start: string; end: string }
  /** Max results */
  limit?: number
}
```

#### `data/engine/query-builder.ts`

```typescript
/**
 * Builds graph queries from shape metadata + filter parameters.
 * The shape definition tells us which predicates to query;
 * the filters tell us what values to match.
 */

export function buildQuery(
  shape: ShapeDefinition,
  filters: QueryFilters,
): TripleQuery | string  // returns TripleQuery for simple filters, SPARQL string for complex
```

#### `data/engine/graph-context.ts`

```typescript
/**
 * Bootstrap:
 * 1. navigator.graph.create("My Calendar") or find existing
 * 2. For each shape in SHAPE_REGISTRY: graph.addShape(name, JSON.stringify(shape))
 * 3. Provide graph + InstanceOps to the component tree via SolidJS context
 */
```

### Declarative ICS Mapping

No per-field conversion functions. The mapping table drives both import and export.

#### `data/derivations/ics-mapping.ts`

```typescript
/**
 * Generic ICS ↔ shape mapping, driven entirely by the icsMapping annotation.
 *
 * Import: for each VEVENT property, look up which shape property it maps to.
 * Export: for each shape property, look up which ICS property to emit.
 *
 * Datatype conversion is derived from the shape property's datatype:
 *   'dateTime' → ICS datetime format conversion
 *   'string'   → direct passthrough
 *
 * No per-field code.
 */

export function importVEvent(
  vevent: ICALComponent,
  mapping: Record<string, string>,
  shape: ShapeDefinition,
): Record<string, unknown>

export function exportVEvent(
  instance: Record<string, unknown>,
  mapping: Record<string, string>,
  shape: ShapeDefinition,
): string
```

### Declarative Validation

#### `data/derivations/validation-rules.ts`

```typescript
/**
 * Validate instance data against:
 * 1. Shape cardinality (minCount/maxCount) — derived from shape definition
 * 2. Shape datatypes — derived from shape definition
 * 3. Declarative rules from annotations (cross-field comparisons, patterns)
 *
 * Returns an array of validation errors (empty = valid).
 */

export function validate(
  shapeName: string,
  data: Record<string, unknown>,
  registry: Record<string, RegisteredShape>,
): ValidationError[]

export interface ValidationError {
  field: string
  rule: string
  message: string
}
```

### Transforms (Pure Functions)

#### `data/transforms/rrule.ts`

```typescript
/** Parse RRULE string into structured options */
export function parseRRule(rrule: string): RRuleOptions

/** Expand a recurring event into concrete occurrences within a window */
export function expandOccurrences(
  rrule: string,
  dtstart: string,
  windowStart: string,
  windowEnd: string,
): Occurrence[]

export interface Occurrence {
  startDate: string
  endDate: string
  parentUri: string    // the recurring event this was expanded from
  occurrenceIndex: number
}
```

#### `data/transforms/freebusy-gen.ts`

```typescript
/**
 * Pure projection: events → free/busy slots.
 * Strips all event details — only produces time ranges + status.
 */
export function eventsToFreeBusy(
  events: Record<string, unknown>[],
  windowStart: string,
  windowEnd: string,
): FreeBusySlot[]
```

#### `data/transforms/slot-finder.ts`

```typescript
/**
 * Pure function: given N participants' FreeBusy windows,
 * find the earliest mutually free slot of a given duration.
 */
export function findFreeSlot(
  participants: FreeBusySlot[][],
  durationMinutes: number,
  searchStart: string,
  searchEnd: string,
): { start: string; end: string } | null
```

### Pipelines (Composed Chains)

#### `data/pipelines/visible-events.ts`

```typescript
/**
 * The main data pipeline for the calendar UI.
 *
 * Pipeline:
 *   1. query(Event, { dateRange: { property: 'startDate', start, end } })
 *   2. → for each with recurrence: expandOccurrences()
 *   3. → filter by visibleCalendars
 *   4. → sort by startDate
 *   5. → return
 *
 * Each step is a pure function. The pipeline is re-evaluated
 * reactively when view state changes (date range, visible calendars).
 */
export function visibleEventsPipeline(
  instanceOps: InstanceOps,
  viewRange: { start: string; end: string },
  visibleCalendars: Set<string>,
): Promise<DisplayEvent[]>

export interface DisplayEvent {
  uri: string
  parentUri?: string              // set for expanded recurrence occurrences
  data: Record<string, unknown>   // shape instance data
  calendarColor: string           // resolved from CalendarMeta
}
```

---

## Layer 0 Tests

All tests use Vitest. The test environment provides a mock `navigator.graph` — an in-memory implementation of the Living Web `PersonalGraph` interface (no AD4M executor needed).

```
data/__tests__/
├── instance-ops.test.ts
├── query-builder.test.ts
├── validation.test.ts
├── ics.test.ts
├── rrule.test.ts
├── freebusy.test.ts
├── slot-finder.test.ts
├── pipeline.test.ts
└── shapes.test.ts
```

### `shapes.test.ts` — Shape Definition Integrity

| # | Test | Level | Description |
|---|------|-------|-------------|
| SC-01 | `Every shape in SHAPE_REGISTRY MUST have a targetClass` | MUST | All registered shapes MUST have a non-empty targetClass. |
| SC-02 | `Every shape property MUST have a valid predicate URI (schema:// or agenda://)` | MUST | No bare strings or typos in predicate paths. |
| SC-03 | `Every shape property MUST have a name matching [a-zA-Z_][a-zA-Z0-9_]*` | MUST | Per Living Web spec. |
| SC-04 | `Shape property names MUST be unique within each shape` | MUST | No duplicate property names. |
| SC-05 | `Constructor actions MUST reference only declared property names as targets` | MUST | Constructor target values that aren't literal URIs MUST correspond to a property name. |
| SC-06 | `Every shape MUST have annotations in the registry` | MUST | Each RegisteredShape MUST have both shape and annotations. |
| SC-07 | `Every shape property MUST have a corresponding field annotation` | MUST | The annotations.fields keys MUST be a superset of the shape property names. |
| SC-08 | `Annotation defaults MUST only reference declared property names` | MUST | No defaults for non-existent properties. |
| SC-09 | `Annotation validation rules MUST only reference declared property names` | MUST | Both field and referenceField MUST exist on the shape. |
| SC-10 | `ICS mapping keys MUST only reference declared property names` | MUST | No orphan ICS mappings. |

### `instance-ops.test.ts` — Generic CRUD

| # | Test | Level | Description |
|---|------|-------|-------------|
| IO-01 | `create() MUST generate a unique URI for every instance` | MUST | Two calls with identical data MUST produce different URIs. |
| IO-02 | `create() MUST apply declarative defaults from annotations` | MUST | Creating an Event without status MUST result in `status: 'EventScheduled'`. |
| IO-03 | `create() MUST reject if a required property (minCount ≥ 1) is missing` | MUST | Omitting `name` on an Event MUST throw a validation error. |
| IO-04 | `create() MUST run validation rules before persisting` | MUST | An Event with endDate before startDate MUST be rejected. |
| IO-05 | `create() MUST call graph.createShapeInstance() with correct shape and data` | MUST | The mock graph MUST receive exactly the shape name, URI, and merged data. |
| IO-06 | `get() MUST return instance data for a valid URI` | MUST | After create, get with the returned URI MUST return matching data. |
| IO-07 | `get() MUST return null for an unknown URI` | MUST | Non-existent URI MUST return null, not throw. |
| IO-08 | `update() MUST modify only the specified fields` | MUST | Updating `name` MUST NOT change `startDate` or other fields. |
| IO-09 | `update() MUST re-validate after applying the patch` | MUST | Updating endDate to before startDate MUST be rejected. |
| IO-10 | `update() MUST call the correct graph property operations` | MUST | Scalar properties → setShapeProperty. Collections → addToShapeCollection/removeFromShapeCollection. |
| IO-11 | `delete() MUST remove all triples for the instance` | MUST | After delete, get MUST return null. |
| IO-12 | `delete() MUST return true for existing, false for non-existent` | MUST | Matches graph.removeTriple semantics. |
| IO-13 | `query() with dateRange MUST return instances overlapping the range` | MUST | Includes events starting before but ending within, fully within, and starting within but ending after. |
| IO-14 | `query() with dateRange MUST NOT return instances outside the range` | MUST | Events ending before range start or starting after range end excluded. |
| IO-15 | `query() with where filter MUST match by property value` | MUST | `where: { calendarId: 'work' }` returns only work calendar events. |
| IO-16 | `create() MUST work for any shape in the registry (not just Event)` | MUST | Creating a MeetingRequest or FreeBusy MUST follow the same code path. |
| IO-17 | `The InstanceOps interface MUST NOT contain any shape-specific methods` | MUST | No `createEvent()` or `createMeetingRequest()` — only generic `create(shapeName, data)`. |

### `query-builder.test.ts` — Query Derivation

| # | Test | Level | Description |
|---|------|-------|-------------|
| QB-01 | `buildQuery() MUST derive predicates from shape property paths` | MUST | A filter on `calendarId` MUST produce a query using the `agenda://calendarId` predicate. |
| QB-02 | `buildQuery() with dateRange MUST produce a temporal range query` | MUST | dateRange on `startDate` MUST constrain by `schema://startDate`. |
| QB-03 | `buildQuery() with multiple filters MUST combine them with AND` | MUST | `where: { calendarId: 'work' }` + `dateRange` MUST intersect. |
| QB-04 | `buildQuery() MUST handle collection properties (no maxCount)` | MUST | Filtering on `attendees` MUST match any value in the collection. |

### `validation.test.ts` — Declarative Validation

| # | Test | Level | Description |
|---|------|-------|-------------|
| VL-01 | `validate() MUST check minCount for required properties` | MUST | Missing `name` → error on `name` field. |
| VL-02 | `validate() MUST check datatype constraints` | MUST | Non-datetime string for `startDate` → error. |
| VL-03 | `validate() MUST evaluate comparison rules` | MUST | `endDate <= startDate` → error with the rule's message. |
| VL-04 | `validate() MUST return empty array when all valid` | MUST | A fully valid Event → `[]`. |
| VL-05 | `validate() MUST work for any shape (not just Event)` | MUST | MeetingRequest with missing `from` → error. |
| VL-06 | `validate() MUST evaluate rules ONLY from annotations (no hardcoded logic)` | MUST | Adding a new rule to annotations MUST be enforced without code changes. |

### `ics.test.ts` — Declarative ICS Mapping

| # | Test | Level | Description |
|---|------|-------|-------------|
| I-01 | `importVEvent() MUST map ICS fields to shape properties using the icsMapping table` | MUST | SUMMARY → name, DTSTART → startDate, etc. — all driven by the table. |
| I-02 | `importVEvent() MUST convert ICS datetime to ISO 8601` | MUST | ICS `20260407T100000Z` → `2026-04-07T10:00:00Z`. |
| I-03 | `importVEvent() MUST ignore ICS fields not in the mapping` | MUST | Unmapped ICS properties MUST be silently dropped. |
| I-04 | `importVEvent() MUST handle multiple VEVENTs` | MUST | N VEVENTs → N instance data records. |
| I-05 | `exportVEvent() MUST map shape properties to ICS fields using the icsMapping table` | MUST | name → SUMMARY, startDate → DTSTART, etc. |
| I-06 | `exportVEvent() MUST produce valid iCalendar output` | MUST | BEGIN:VCALENDAR … END:VCALENDAR, VERSION 2.0, PRODID. |
| I-07 | `exportVEvent() MUST generate UID if icsUid is absent` | MUST | Every VEVENT MUST have a UID. |
| I-08 | `importVEvent() → exportVEvent() MUST round-trip core fields` | MUST | Parse → export → re-parse MUST produce equivalent data. |
| I-09 | `Adding a new field to the icsMapping MUST be sufficient to support it (no code change)` | MUST | This is the key declarative test: add a mapping entry, and import/export handles it. |

### `rrule.test.ts` — Recurrence Expansion

| # | Test | Level | Description |
|---|------|-------|-------------|
| R-01 | `parseRRule() MUST parse FREQ=DAILY` | MUST | Frequency extraction. |
| R-02 | `parseRRule() MUST parse FREQ=WEEKLY with BYDAY` | MUST | e.g. `FREQ=WEEKLY;BYDAY=MO,WE,FR`. |
| R-03 | `parseRRule() MUST parse FREQ=MONTHLY` | MUST | Monthly recurrence. |
| R-04 | `parseRRule() MUST parse FREQ=YEARLY` | MUST | Yearly recurrence. |
| R-05 | `parseRRule() MUST parse INTERVAL` | MUST | e.g. `INTERVAL=2` for every other week. |
| R-06 | `parseRRule() MUST parse COUNT` | MUST | Limit total occurrences. |
| R-07 | `parseRRule() MUST parse UNTIL` | MUST | End date for recurrence. |
| R-08 | `expandOccurrences() MUST generate correct dates for daily recurrence` | MUST | 7-day window with FREQ=DAILY → 7 occurrences. |
| R-09 | `expandOccurrences() MUST generate correct dates for weekly with BYDAY` | MUST | 2-week window with BYDAY=MO,WE → 4 occurrences. |
| R-10 | `expandOccurrences() MUST respect COUNT limit` | MUST | FREQ=DAILY;COUNT=3 → at most 3. |
| R-11 | `expandOccurrences() MUST respect UNTIL limit` | MUST | No occurrences after UNTIL date. |
| R-12 | `expandOccurrences() MUST NOT generate occurrences outside the query window` | MUST | Before windowStart or after windowEnd → excluded. |
| R-13 | `expandOccurrences() MUST handle timezone offsets in DTSTART` | MUST | +10:00 offset → correct absolute times. |
| R-14 | `expandOccurrences() SHOULD handle EXDATE` | SHOULD | Exception dates excluded from results. |
| R-15 | `expandOccurrences() MUST set parentUri on each occurrence` | MUST | Occurrences MUST reference the source event for edits. |

### `freebusy.test.ts` — Free/Busy Generation

| # | Test | Level | Description |
|---|------|-------|-------------|
| F-01 | `eventsToFreeBusy() MUST produce busy slots for occupied time` | MUST | Event 10:00–11:00 → busy slot 10:00–11:00. |
| F-02 | `eventsToFreeBusy() MUST produce free slots for unoccupied time` | MUST | Gap between events → free slot. |
| F-03 | `eventsToFreeBusy() MUST NOT include any event details` | MUST | Only start, end, status. No name, description, location. |
| F-04 | `eventsToFreeBusy() MUST handle overlapping events` | MUST | Two overlapping events → single merged busy slot. |
| F-05 | `eventsToFreeBusy() MUST include expanded recurring occurrences` | MUST | Weekly event → busy slot per occurrence in window. |
| F-06 | `eventsToFreeBusy() is a pure function (no graph access)` | MUST | Takes event data arrays as input, returns slots. No side effects. |

### `slot-finder.test.ts` — Mutual Availability

| # | Test | Level | Description |
|---|------|-------|-------------|
| SF-01 | `findFreeSlot() MUST return a slot where no participant is busy` | MUST | Returned slot MUST NOT overlap any busy slot. |
| SF-02 | `findFreeSlot() MUST return the earliest possible slot` | MUST | First available slot from searchStart. |
| SF-03 | `findFreeSlot() MUST return null when no slot exists` | MUST | All time occupied → null. |
| SF-04 | `findFreeSlot() MUST respect the requested duration` | MUST | Slot duration ≥ requested minutes. |
| SF-05 | `findFreeSlot() is a pure function (no graph access)` | MUST | Takes arrays of slots, returns result. No side effects. |

### `pipeline.test.ts` — Composed Pipeline

| # | Test | Level | Description |
|---|------|-------|-------------|
| P-01 | `visibleEventsPipeline() MUST query, expand recurrences, and filter by calendar` | MUST | End-to-end: create events (some recurring, multiple calendars) → pipeline returns only visible, expanded results. |
| P-02 | `visibleEventsPipeline() MUST sort results by startDate ascending` | MUST | Output MUST be chronologically ordered. |
| P-03 | `visibleEventsPipeline() MUST include calendarColor resolved from CalendarMeta` | MUST | Each DisplayEvent MUST have a color. |
| P-04 | `Changing visible calendars MUST change pipeline output (no re-query needed)` | MUST | The filter step operates on in-memory data, not a new graph query. |
| P-05 | `Pipeline MUST be composable from independent pure functions` | MUST | Each stage (query, expand, filter, sort) MUST be independently testable and replaceable. |

---

## Layer 1: Personal Calendar UI

SolidJS components consuming the pipeline output. The key declarative element: **`ShapeForm` renders any shape**, and `EventDetail` is just `ShapeForm` with the Event shape and its annotations.

### Shape-Driven Forms

```typescript
/** ui/forms/ShapeForm.tsx */

/**
 * Renders a form for any registered shape.
 *
 * 1. Reads shape properties from the definition
 * 2. Groups and orders fields using annotations
 * 3. Dispatches each field to FieldRenderer based on inputType
 * 4. Validates on submit using declarative rules
 *
 * No shape-specific code in this component.
 */
interface ShapeFormProps {
  shapeName: string
  data?: Record<string, unknown>          // existing data (for edit mode)
  onSubmit: (data: Record<string, unknown>) => void
  onCancel?: () => void
  groups?: string[]                       // which groups to render (default: all non-system)
}
```

```typescript
/** ui/forms/field-registry.ts */

/**
 * Declarative mapping: inputType → component.
 * Adding a new input type = registering one entry here + writing the component.
 */
export const FIELD_COMPONENTS: Record<InputType, Component<FieldProps>> = {
  text:            TextInput,
  textarea:        TextareaInput,
  url:             UrlInput,
  datetime:        DateTimeInput,
  date:            DateInput,
  time:            TimeInput,
  duration:        DurationInput,
  select:          SelectInput,
  rrule:           RRuleInput,
  'did-list':      DIDListInput,
  'calendar-select': CalendarSelectInput,
  hidden:          HiddenInput,
}
```

### Layer 1 Tests (Playwright E2E)

```
tests/
├── views.spec.ts
├── events.spec.ts
├── shape-form.spec.ts
├── calendar-management.spec.ts
└── ics-import.spec.ts
```

#### `views.spec.ts`

| # | Test | Level | Description |
|---|------|-------|-------------|
| V-01 | `Week view MUST render 7 day columns` | MUST | Default view shows Mon–Sun columns. |
| V-02 | `Week view MUST render hour slots 00:00–23:00` | MUST | 24 hours visible when scrolling. |
| V-03 | `Day view MUST render a single day column` | MUST | Switch to day → one column. |
| V-04 | `Month view MUST render a calendar grid of 4–6 weeks` | MUST | Standard month grid. |
| V-05 | `Agenda view MUST render events in chronological order` | MUST | List sorted by start time. |
| V-06 | `View toggle MUST switch between all four views` | MUST | All buttons functional. |
| V-07 | `Today button MUST navigate to current date` | MUST | Returns to today after navigation. |
| V-08 | `Navigation arrows MUST advance/retreat by view unit` | MUST | Week → ±7 days, month → ±1 month, day → ±1 day. |

#### `events.spec.ts`

| # | Test | Level | Description |
|---|------|-------|-------------|
| E-01 | `Clicking empty time slot MUST open quick-create` | MUST | Pre-fills clicked time. |
| E-02 | `Quick-create MUST create an event visible on the grid` | MUST | Type name, confirm → event appears. |
| E-03 | `Clicking event block MUST open detail panel` | MUST | Shows all fields. |
| E-04 | `Saving edits MUST update the grid` | MUST | Changed name/time reflected immediately. |
| E-05 | `Deleting MUST remove from grid` | MUST | Event block disappears. |
| E-06 | `Events MUST be positioned by time on the grid` | MUST | 10:00–11:00 → 10am row, 1hr span. |
| E-07 | `Events MUST be colored by calendar` | MUST | Different calendars → different colors. |
| E-08 | `Recurring events MUST show each occurrence` | MUST | Weekly event → block per week in view. |

#### `shape-form.spec.ts`

| # | Test | Level | Description |
|---|------|-------|-------------|
| SF-01 | `ShapeForm MUST render fields from shape annotations` | MUST | Every non-hidden field annotation MUST produce a form input. |
| SF-02 | `ShapeForm MUST group fields by annotation group` | MUST | Primary group fields render together, details group together. |
| SF-03 | `ShapeForm MUST order fields by annotation order` | MUST | Lower order values render first. |
| SF-04 | `ShapeForm MUST dispatch to correct input component by inputType` | MUST | datetime → DateTimeInput, select → SelectInput, etc. |
| SF-05 | `ShapeForm MUST show validation errors from declarative rules` | MUST | endDate < startDate → error message from the rule. |
| SF-06 | `ShapeForm MUST work for any registered shape` | MUST | Render with MeetingRequest or CalendarMeta → correct form. |

#### `calendar-management.spec.ts`

| # | Test | Level | Description |
|---|------|-------|-------------|
| C-01 | `Sidebar MUST list all calendars` | MUST | At least one on first run. |
| C-02 | `Creating a new calendar MUST add it to sidebar` | MUST | Immediate appearance. |
| C-03 | `Toggling visibility MUST show/hide events` | MUST | Uncheck → events gone, re-check → restored. |
| C-04 | `Calendar color MUST be reflected on events` | MUST | Color change → events update. |

#### `ics-import.spec.ts`

| # | Test | Level | Description |
|---|------|-------|-------------|
| IC-01 | `Dropping .ics file MUST trigger import` | MUST | Drag-and-drop → events created. |
| IC-02 | `Import MUST create events for each VEVENT` | MUST | 5 VEVENTs → 5 events. |
| IC-03 | `Imported events MUST appear on the grid` | MUST | Visible at correct times. |
| IC-04 | `Invalid file MUST show error` | MUST | Non-ICS → user-facing error. |

---

## Layer 2: Meeting Requests (State Machine)

The request lifecycle is a declarative state machine, not imperative method calls.

### `scheduling/request-transitions.ts`

```typescript
/**
 * Declarative state machine for meeting request status transitions.
 * Each transition defines: fromState → toState, required fields, side effects.
 */

export interface Transition {
  from: RequestStatus
  to: RequestStatus
  requiredFields?: string[]                // fields that MUST be set during this transition
  sideEffects?: SideEffect[]               // declarative descriptions of what happens
}

export type SideEffect =
  | { type: 'createInstance'; shape: string; in: 'personal' | 'shared' }
  | { type: 'updateInstance'; shape: string; in: 'personal' | 'shared' }

export const REQUEST_TRANSITIONS: Transition[] = [
  { from: 'pending', to: 'accepted',
    sideEffects: [
      { type: 'createInstance', shape: 'Event', in: 'personal' },
      { type: 'updateInstance', shape: 'MeetingRequest', in: 'shared' },
    ] },
  { from: 'pending', to: 'declined',
    sideEffects: [
      { type: 'updateInstance', shape: 'MeetingRequest', in: 'shared' },
    ] },
  { from: 'pending', to: 'tentative',
    sideEffects: [
      { type: 'updateInstance', shape: 'MeetingRequest', in: 'shared' },
    ] },
  { from: 'pending', to: 'counter',
    requiredFields: ['counterStart', 'counterEnd'],
    sideEffects: [
      { type: 'updateInstance', shape: 'MeetingRequest', in: 'shared' },
    ] },
  { from: 'counter', to: 'accepted',
    sideEffects: [
      { type: 'createInstance', shape: 'Event', in: 'personal' },
      { type: 'updateInstance', shape: 'MeetingRequest', in: 'shared' },
    ] },
  { from: 'counter', to: 'declined',
    sideEffects: [
      { type: 'updateInstance', shape: 'MeetingRequest', in: 'shared' },
    ] },
  { from: 'counter', to: 'counter',
    requiredFields: ['counterStart', 'counterEnd'],
    sideEffects: [
      { type: 'updateInstance', shape: 'MeetingRequest', in: 'shared' },
    ] },
]
```

### Layer 2 Tests

| # | Test | Level | Description |
|---|------|-------|-------------|
| M-01 | `Transition pending→accepted MUST be in REQUEST_TRANSITIONS` | MUST | Valid transition. |
| M-02 | `Transition pending→counter MUST require counterStart and counterEnd` | MUST | Missing fields → rejected. |
| M-03 | `Transition accepted→pending MUST NOT be in REQUEST_TRANSITIONS` | MUST | Invalid backward transition. |
| M-04 | `Executing pending→accepted MUST create Event in personal graph` | MUST | Side effect fires. |
| M-05 | `Executing pending→accepted MUST update MeetingRequest in shared graph` | MUST | Side effect fires. |
| M-06 | `Executing pending→declined MUST NOT create Event in personal graph` | MUST | No Event side effect. |
| M-07 | `All transitions MUST reference shapes that exist in SHAPE_REGISTRY` | MUST | No orphan shape references. |
| M-08 | `Initiating a request MUST create a shared graph containing MeetingRequest` | MUST | Shape registered, instance created with status 'pending'. |
| M-09 | `Transition counter→counter MUST allow re-negotiation` | MUST | Multiple counter-proposals permitted. |

---

## Layer 4: Shared Calendars + Governance

### `shared/governance-rules.ts`

```typescript
/**
 * Declarative role → permission mapping.
 * The governance engine reads this table — no if/else permission checking.
 */
export const ROLE_PERMISSIONS: Record<string, Set<string>> = {
  admin:  new Set(['create', 'edit', 'delete', 'grant-role', 'revoke-role']),
  editor: new Set(['create', 'edit']),
  viewer: new Set([]),
}

/**
 * Check permission by table lookup.
 */
export function canPerform(role: string, action: string): boolean {
  return ROLE_PERMISSIONS[role]?.has(action) ?? false
}
```

### Layer 4 Tests

| # | Test | Level | Description |
|---|------|-------|-------------|
| SH-01 | `createSharedCalendar() MUST register Event shape on shared graph` | MUST | Shape exists after creation. |
| SH-02 | `createSharedCalendar() MUST return a share URL` | MUST | URL usable for joining. |
| SH-03 | `Events created by member A MUST be queryable by member B` | MUST | Shared graph sync. |
| SH-04 | `Creator MUST automatically receive admin role` | MUST | Governance triple set on creation. |
| G-01 | `ROLE_PERMISSIONS admin MUST include create, edit, delete, grant-role, revoke-role` | MUST | Table correctness. |
| G-02 | `ROLE_PERMISSIONS editor MUST include create, edit but NOT delete` | MUST | Table correctness. |
| G-03 | `ROLE_PERMISSIONS viewer MUST include nothing` | MUST | Read-only. |
| G-04 | `canPerform() MUST return false for unknown roles` | MUST | Fail-closed. |
| G-05 | `Adding a new role to ROLE_PERMISSIONS MUST be sufficient (no code change)` | MUST | The key declarative test. |

---

## Layer 5: Onboarding

### `onboarding/natural-language.ts`

```typescript
/**
 * Pattern-based parser. Rules are declared as patterns, not procedural code.
 */
export interface NLPattern {
  pattern: RegExp
  extract: Record<string, number>          // shape property name → capture group index
  transform?: Record<string, (raw: string, refDate: string) => string>
}

export const NL_PATTERNS: NLPattern[] = [
  {
    pattern: /^(.+?)\s+(?:at|@)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*$/i,
    extract: { name: 1, startDate: 2 },
    transform: { startDate: parseTimeRelative },
  },
  // ... more patterns
]
```

### Layer 5 Tests

| # | Test | Level | Description |
|---|------|-------|-------------|
| NL-01 | `"Coffee tomorrow at 10am" MUST parse name and startDate` | MUST | Pattern match + time resolution. |
| NL-02 | `"Meeting with Nico 3pm-4pm Friday" MUST parse name, start, end` | MUST | Range pattern. |
| NL-03 | `"Dentist next Tuesday" MUST parse name and date` | MUST | Relative date resolution. |
| NL-04 | `Unparseable input MUST return null` | MUST | No match → null, not throw. |
| NL-05 | `Adding a new NL_PATTERN MUST be sufficient to handle new formats (no code change)` | MUST | Declarative extensibility. |

---

## Test Infrastructure

### Mock Graph Backend

In-memory implementation of the Living Web `PersonalGraph` / `PersonalGraphManager` interface. Shape-aware: validates against registered shape definitions.

### Declarative Invariant Tests

In addition to the per-module tests above, a suite of *structural invariant tests* verifies the declarative properties hold:

| # | Test | Level | Description |
|---|------|-------|-------------|
| D-01 | `No module outside data/shapes/ may contain a predicate URI string literal` | MUST | Predicates come from shape definitions only. |
| D-02 | `No module outside data/derivations/ may contain hardcoded default values` | MUST | Defaults come from annotations only. |
| D-03 | `instance-ops.ts MUST NOT import any specific shape definition` | MUST | It reads from the registry, never from `event.ts` directly. |
| D-04 | `ShapeForm.tsx MUST NOT import any specific shape definition` | MUST | It reads from the registry via context. |
| D-05 | `Every ICS field mapping MUST be testable by adding one table entry` | MUST | No per-field conversion functions. |

---

## Implementation Order

1. **Layer 0** — Shapes, annotations, engine, transforms, pipelines. All unit tests green.
2. **Layer 1** — Shape-driven UI: ShapeForm, views, event blocks. E2E tests green.
3. **Layer 2** — State machine for meeting requests. Unit tests green.
4. **Layer 3** (Free/busy transforms are already in Layer 0 — this layer adds the publishing/overlay UI).
5. **Layer 4** — Shared calendars + governance table. Unit tests green.
6. **Layer 5** — NL patterns, import wizard. Unit tests green.

Each layer is a milestone. No layer starts until the previous one's tests are green.
