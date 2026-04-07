# Agenda: Implementation Plan

**Sovereign calendar built on AD4M.**

---

## Design Principles

**AD4M-native and declarative.** Ad4mModel classes are the single source of truth for the data schema. Annotations layer Agenda-specific metadata (UI hints, ICS mapping, validation, defaults) on top. Types, validation, queries, form generation, and governance rules are all _derived_ from model metadata + annotations — never duplicated in parallel code.

1. **Models are the schema.** `@Model`/`@Property`/`@Optional`/`@HasMany` decorators on Ad4mModel classes declare every property, its predicate path, and cardinality. The SHACL subject class is generated automatically by AD4M from these decorators.
2. **Annotations are data.** ICS field mapping, form field rendering hints, validation rules, default values — all declared as lookup tables keyed by model property name. No per-field functions.
3. **Queries are fluent.** `AgendaEvent.query(perspective).where({...}).order({...}).limit(N).run()` — composed from model metadata + parameters. Not hand-written SPARQL per use case.
4. **UI is model-driven.** Event detail forms are rendered by iterating `AgendaEvent.getModelMetadata()` properties + annotations — not by hand-coding a field per property.
5. **Operations are model methods.** `AgendaEvent.create(perspective, data)`, `event.save()`, `event.delete()` — the Ad4mModel base class provides all CRUD. Calendar-specific logic (defaults, validation) is expressed as declarative rules in annotations.
6. **Pipelines, not procedures.** Data flows through declarative transformation pipelines: `model → query → instances → expand recurrences → filter visible calendars → render`. Each stage is a pure function of its inputs.
7. **Neighbourhoods for sharing.** Shared calendars are AD4M neighbourhoods. `perspective.publishFromPerspective()` to publish, `ad4mClient.neighbourhood.joinFromUrl()` to join. P2P sync via Holochain.

---

## Dependencies

| Package                | Purpose                                                                   |
| ---------------------- | ------------------------------------------------------------------------- |
| `@coasys/ad4m`         | AD4M SDK — Ad4mModel base class, decorators, PerspectiveProxy, Ad4mClient |
| `@coasys/ad4m-connect` | Connection UI/flow to running AD4M executor                               |
| `solid-js`             | Reactive UI framework                                                     |
| `tailwindcss`          | Styling                                                                   |
| `ical.js`              | ICS parsing/generation (VEVENT, RRULE, VALARM)                            |

---

## Package Structure

```
agenda/
├── src/
│   ├── index.tsx                          # App mount
│   ├── index.css                          # Tailwind + base styles
│   ├── App.tsx                            # Root: ad4m-connect, bootstrap, provide context
│   │
│   ├── data/                              # Layer 0 — Declarative Data Foundation
│   │   ├── models/                        # Ad4mModel classes (the single source of truth)
│   │   │   ├── event.ts                   # AgendaEvent model + annotations
│   │   │   ├── meeting-request.ts         # MeetingRequest model + annotations
│   │   │   ├── freebusy.ts               # FreeBusy model + annotations
│   │   │   ├── calendar-meta.ts           # CalendarMeta model + annotations
│   │   │   └── index.ts                   # Model registry (all models, lookup by name)
│   │   │
│   │   ├── context/                       # AD4M connection + perspective management
│   │   │   ├── ad4m-context.ts            # Ad4mClient + PerspectiveProxy SolidJS context
│   │   │   ├── bootstrap.ts              # Connect, get/create perspective, register models
│   │   │   └── subscriptions.ts           # Model.query(perspective).subscribe() wrappers
│   │   │
│   │   ├── annotations/                   # Agenda-level metadata (UI, ICS, validation)
│   │   │   ├── types.ts                   # ShapeAnnotations, FieldAnnotation, ValidationRule types
│   │   │   ├── defaults.ts                # Apply defaults from annotations before create
│   │   │   ├── validation-rules.ts        # Validate data against model metadata + annotation rules
│   │   │   └── ics-mapping.ts             # ICS ↔ model field mapping (driven by annotation table)
│   │   │
│   │   ├── transforms/                    # Pure data transformations (no AD4M access)
│   │   │   ├── ics.ts                     # ICS import/export (driven by ics-mapping table)
│   │   │   ├── rrule.ts                   # RRULE parsing + occurrence expansion
│   │   │   ├── freebusy-gen.ts            # Events → FreeBusy slots (pure projection)
│   │   │   └── slot-finder.ts             # FreeBusy windows → mutual free slots
│   │   │
│   │   └── pipelines/                     # Composed query + transform chains
│   │       ├── visible-events.ts          # query → instances → expand rrule → filter calendars
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
│   │   │   ├── EventDetail.tsx            # Model-driven editor (iterates model metadata + annotations)
│   │   │   ├── QuickCreate.tsx            # Click-to-create popover
│   │   │   └── EventDrag.tsx              # Drag/resize logic
│   │   ├── forms/                         # Generic model-driven form components
│   │   │   ├── ModelForm.tsx              # Renders a form from any Ad4mModel metadata + annotations
│   │   │   ├── FieldRenderer.tsx          # Dispatches to input type by annotation inputType
│   │   │   └── field-registry.ts          # Maps inputType → component (declarative)
│   │   ├── components/
│   │   │   ├── TimeGrid.tsx               # Shared hour-slot grid
│   │   │   ├── DatePicker.tsx             # Mini calendar
│   │   │   ├── TimePicker.tsx             # Time input
│   │   │   └── CalendarChip.tsx           # Colored label
│   │   └── state/
│   │       ├── view-state.ts              # Current view, date, range (SolidJS store)
│   │       ├── calendar-state.ts          # Visible calendars, calendar metadata (SolidJS store)
│   │       └── event-state.ts             # Reactive query results (derived from subscriptions)
│   │
│   ├── scheduling/                        # Layer 2 — Person-to-Person Scheduling
│   │   ├── invite-flow.ts                 # event+attendee → neighbourhood → MeetingRequest
│   │   ├── request-transitions.ts         # Declarative state machine
│   │   ├── InvitePanel.tsx                # Incoming/outgoing request list
│   │   └── ContactPicker.tsx              # DID search
│   │
│   ├── shared/                            # Layer 4 — Shared Calendars
│   │   ├── shared-calendar-ops.ts         # Create/join/leave via neighbourhoods
│   │   ├── governance-rules.ts            # Declarative role→permission mapping table
│   │   └── SharedCalendarSettings.tsx     # Membership + role management UI
│   │
│   └── onboarding/                        # Layer 5 — Adoption
│       ├── import-wizard.ts               # ICS file → ics-mapping → AgendaEvent.create pipeline
│       ├── natural-language.ts            # Quick-add string → partial event fields
│       └── WelcomeWizard.tsx              # First-run UI
│
├── tests/                                 # Playwright E2E tests
├── .storybook/                            # Storybook config
├── index.html
├── vite.config.ts
├── tsconfig.json
├── playwright.config.ts
├── PLAN.md
└── package.json
```

---

## AD4M Connection & Bootstrap

### `App.tsx` — Root

```typescript
import { Ad4mConnectElement } from '@coasys/ad4m-connect'
import { Ad4mClient } from '@coasys/ad4m'
import { bootstrap } from './data/context/bootstrap'

/**
 * App root:
 * 1. ad4m-connect handles executor discovery + auth
 * 2. On connection, bootstrap perspective + register models
 * 3. Provide Ad4mClient + PerspectiveProxy via SolidJS context
 */
function App() {
  const [perspective, setPerspective] = createSignal<PerspectiveProxy | null>(null)
  const [client, setClient] = createSignal<Ad4mClient | null>(null)

  onMount(async () => {
    // ad4m-connect provides the connected client
    const ad4mClient = await connectToAd4m() // via @coasys/ad4m-connect
    setClient(ad4mClient)

    const p = await bootstrap(ad4mClient, 'My Calendar')
    setPerspective(p)
  })

  return (
    <Ad4mContext.Provider value={{ client, perspective }}>
      <Show when={perspective()} fallback={<ConnectingScreen />}>
        <Shell />
      </Show>
    </Ad4mContext.Provider>
  )
}
```

### `data/context/bootstrap.ts`

```typescript
import { Ad4mClient, PerspectiveProxy } from '@coasys/ad4m'
import { AgendaEvent } from '../models/event'
import { MeetingRequest } from '../models/meeting-request'
import { FreeBusy } from '../models/freebusy'
import { CalendarMeta } from '../models/calendar-meta'

const ALL_MODELS = [AgendaEvent, MeetingRequest, FreeBusy, CalendarMeta]

/**
 * Bootstrap:
 * 1. Find or create the personal calendar perspective
 * 2. Register all Ad4mModel subject classes on it
 * 3. Return the PerspectiveProxy for the app to use
 */
export async function bootstrap(client: Ad4mClient, name: string): Promise<PerspectiveProxy> {
  // Find existing perspective by name, or create new
  const perspectives = await client.perspective.all()
  let perspective = perspectives.find((p) => p.name === name)
  if (!perspective) {
    perspective = await client.perspective.add(name)
  }

  // Register all models (idempotent — AD4M skips if already registered)
  for (const ModelClass of ALL_MODELS) {
    await perspective.ensureSDNASubjectClass(ModelClass)
  }

  return perspective
}
```

### `data/context/ad4m-context.ts`

```typescript
import { createContext, useContext } from 'solid-js'
import type { Ad4mClient, PerspectiveProxy } from '@coasys/ad4m'

export interface Ad4mContextValue {
  client: () => Ad4mClient | null
  perspective: () => PerspectiveProxy | null
}

export const Ad4mContext = createContext<Ad4mContextValue>()

export function useAd4m(): Ad4mContextValue {
  const ctx = useContext(Ad4mContext)
  if (!ctx) throw new Error('useAd4m() called outside Ad4mContext.Provider')
  return ctx
}

export function usePerspective(): () => PerspectiveProxy {
  const { perspective } = useAd4m()
  return () => {
    const p = perspective()
    if (!p) throw new Error('Perspective not yet available')
    return p
  }
}
```

### `data/context/subscriptions.ts`

```typescript
import type { PerspectiveProxy } from '@coasys/ad4m'

/**
 * Subscribe to model changes using Ad4mModel's fluent query API.
 * Returns an unsubscribe function.
 */
export function subscribeToModel<T>(
  ModelClass: { query(p: PerspectiveProxy): any },
  perspective: PerspectiveProxy,
  callback: (instances: T[]) => void
): () => void {
  return ModelClass.query(perspective).subscribe(callback)
}
```

---

## Layer 0: Declarative Data Foundation

### Model Definitions (the source of truth)

Each model is an Ad4mModel class with decorators defining the schema. **Annotations** are Agenda-specific metadata that sit alongside the model — driving UI rendering, ICS mapping, validation, and defaults. `getModelMetadata()` gives the property/relation structure; annotations add the UI/ICS/validation layer on top.

#### `data/models/event.ts`

```typescript
import { Ad4mModel, Model, Property, Optional, ReadOnly, HasMany } from '@coasys/ad4m'
import type { ShapeAnnotations } from '../annotations/types'

@Model({ name: 'AgendaEvent' })
export class AgendaEvent extends Ad4mModel {
  @Property({ through: 'schema://name', resolveLanguage: 'literal', required: true })
  name: string = ''

  @Property({ through: 'schema://startDate', resolveLanguage: 'literal', required: true })
  startDate: string = ''

  @Property({ through: 'schema://endDate', resolveLanguage: 'literal', required: true })
  endDate: string = ''

  @Optional({ through: 'schema://location', resolveLanguage: 'literal' })
  location: string = ''

  @Optional({ through: 'schema://description', resolveLanguage: 'literal' })
  description: string = ''

  @ReadOnly({ through: 'schema://organizer' })
  organizer: string = ''

  @HasMany({ through: 'schema://attendee' })
  attendees: string[] = []

  @Optional({ through: 'schema://eventStatus', resolveLanguage: 'literal' })
  status: string = 'EventScheduled'

  @Optional({ through: 'schema://eventAttendanceMode', resolveLanguage: 'literal' })
  attendanceMode: string = ''

  @Optional({ through: 'schema://url', resolveLanguage: 'literal' })
  url: string = ''

  @Optional({ through: 'agenda://recurrence', resolveLanguage: 'literal' })
  recurrence: string = ''

  @Optional({ through: 'agenda://reminder', resolveLanguage: 'literal' })
  reminder: string = ''

  @Optional({ through: 'agenda://visibility', resolveLanguage: 'literal' })
  visibility: string = 'private'

  @Optional({ through: 'agenda://calendarId', resolveLanguage: 'literal' })
  calendarId: string = ''

  @Optional({ through: 'agenda://icsUid', resolveLanguage: 'literal' })
  icsUid: string = ''
}

/** Agenda-level annotations — drives UI, validation, defaults, ICS mapping */
export const EVENT_ANNOTATIONS: ShapeAnnotations = {
  fields: {
    name: { label: 'Title', inputType: 'text', group: 'primary', order: 0 },
    startDate: { label: 'Start', inputType: 'datetime', group: 'primary', order: 1 },
    endDate: { label: 'End', inputType: 'datetime', group: 'primary', order: 2 },
    location: { label: 'Location', inputType: 'text', group: 'details', order: 3 },
    description: { label: 'Description', inputType: 'textarea', group: 'details', order: 4 },
    organizer: { label: 'Organizer', inputType: 'hidden', group: 'system', order: -1 },
    attendees: { label: 'Attendees', inputType: 'did-list', group: 'people', order: 5 },
    status: {
      label: 'Status',
      inputType: 'select',
      group: 'details',
      order: 6,
      options: ['EventScheduled', 'EventCancelled', 'EventPostponed', 'EventRescheduled']
    },
    attendanceMode: {
      label: 'Attendance',
      inputType: 'select',
      group: 'details',
      order: 7,
      options: ['OnlineEventAttendanceMode', 'OfflineEventAttendanceMode', 'MixedEventAttendanceMode']
    },
    url: { label: 'URL', inputType: 'url', group: 'details', order: 8 },
    recurrence: { label: 'Repeat', inputType: 'rrule', group: 'details', order: 9 },
    reminder: { label: 'Reminder', inputType: 'duration', group: 'details', order: 10 },
    visibility: {
      label: 'Visibility',
      inputType: 'select',
      group: 'details',
      order: 11,
      options: ['private', 'busy', 'public']
    },
    calendarId: { label: 'Calendar', inputType: 'calendar-select', group: 'primary', order: 12 },
    icsUid: { label: 'ICS UID', inputType: 'hidden', group: 'system', order: -1 }
  },
  defaults: {
    status: 'EventScheduled',
    visibility: 'private'
  },
  rules: [
    {
      type: 'comparison',
      field: 'endDate',
      operator: '>',
      referenceField: 'startDate',
      message: 'End date must be after start date'
    }
  ],
  icsMapping: {
    name: 'SUMMARY',
    startDate: 'DTSTART',
    endDate: 'DTEND',
    location: 'LOCATION',
    description: 'DESCRIPTION',
    organizer: 'ORGANIZER',
    attendees: 'ATTENDEE',
    status: 'STATUS',
    recurrence: 'RRULE',
    icsUid: 'UID',
    reminder: 'VALARM.TRIGGER'
  }
}
```

#### `data/models/meeting-request.ts`

```typescript
import { Ad4mModel, Model, Property, Optional, ReadOnly, HasMany } from '@coasys/ad4m'
import type { ShapeAnnotations } from '../annotations/types'

@Model({ name: 'MeetingRequest' })
export class MeetingRequest extends Ad4mModel {
  @Property({ through: 'agenda://eventRef', resolveLanguage: 'literal', required: true })
  eventRef: string = ''

  @Property({ through: 'schema://organizer', resolveLanguage: 'literal', required: true })
  organizer: string = ''

  @HasMany({ through: 'schema://attendee' })
  attendees: string[] = []

  @Property({ through: 'agenda://status', resolveLanguage: 'literal', required: true })
  status: string = 'pending'

  @Optional({ through: 'agenda://message', resolveLanguage: 'literal' })
  message: string = ''

  @Optional({ through: 'agenda://proposedTimes', resolveLanguage: 'literal' })
  proposedTimes: string = ''

  @ReadOnly({ through: 'schema://dateCreated' })
  dateCreated: string = ''
}

export const MEETING_REQUEST_ANNOTATIONS: ShapeAnnotations = {
  fields: {
    eventRef: { label: 'Event', inputType: 'hidden', group: 'system', order: -1 },
    organizer: { label: 'From', inputType: 'hidden', group: 'system', order: -1 },
    attendees: { label: 'To', inputType: 'did-list', group: 'primary', order: 0 },
    status: {
      label: 'Status',
      inputType: 'select',
      group: 'primary',
      order: 1,
      options: ['pending', 'accepted', 'declined', 'tentative', 'cancelled']
    },
    message: { label: 'Message', inputType: 'textarea', group: 'details', order: 2 },
    proposedTimes: { label: 'Proposed Times', inputType: 'textarea', group: 'details', order: 3 },
    dateCreated: { label: 'Created', inputType: 'hidden', group: 'system', order: -1 }
  },
  defaults: {
    status: 'pending'
  },
  rules: [],
  icsMapping: {}
}
```

#### `data/models/freebusy.ts`

```typescript
import { Ad4mModel, Model, Property, Optional } from '@coasys/ad4m'
import type { ShapeAnnotations } from '../annotations/types'

@Model({ name: 'FreeBusy' })
export class FreeBusy extends Ad4mModel {
  @Property({ through: 'schema://startDate', resolveLanguage: 'literal', required: true })
  startDate: string = ''

  @Property({ through: 'schema://endDate', resolveLanguage: 'literal', required: true })
  endDate: string = ''

  @Property({ through: 'agenda://busyType', resolveLanguage: 'literal', required: true })
  busyType: string = 'busy'

  @Property({ through: 'schema://organizer', resolveLanguage: 'literal', required: true })
  owner: string = ''

  @Optional({ through: 'agenda://calendarId', resolveLanguage: 'literal' })
  calendarId: string = ''
}

export const FREE_BUSY_ANNOTATIONS: ShapeAnnotations = {
  fields: {
    startDate: { label: 'Start', inputType: 'datetime', group: 'primary', order: 0 },
    endDate: { label: 'End', inputType: 'datetime', group: 'primary', order: 1 },
    busyType: {
      label: 'Type',
      inputType: 'select',
      group: 'primary',
      order: 2,
      options: ['free', 'busy', 'tentative']
    },
    owner: { label: 'Owner', inputType: 'hidden', group: 'system', order: -1 },
    calendarId: { label: 'Calendar', inputType: 'hidden', group: 'system', order: -1 }
  },
  defaults: {
    busyType: 'busy'
  },
  rules: [
    {
      type: 'comparison',
      field: 'endDate',
      operator: '>',
      referenceField: 'startDate',
      message: 'End date must be after start date'
    }
  ],
  icsMapping: {
    startDate: 'DTSTART',
    endDate: 'DTEND',
    busyType: 'FBTYPE'
  }
}
```

#### `data/models/calendar-meta.ts`

```typescript
import { Ad4mModel, Model, Property, Optional, Flag } from '@coasys/ad4m'
import type { ShapeAnnotations } from '../annotations/types'

@Model({ name: 'CalendarMeta' })
export class CalendarMeta extends Ad4mModel {
  @Property({ through: 'schema://name', resolveLanguage: 'literal', required: true })
  name: string = ''

  @Optional({ through: 'agenda://color', resolveLanguage: 'literal' })
  color: string = '#4285f4'

  @Optional({ through: 'schema://description', resolveLanguage: 'literal' })
  description: string = ''

  @Flag({ through: 'agenda://isDefault' })
  isDefault: boolean = false

  @Flag({ through: 'agenda://isVisible' })
  isVisible: boolean = true

  @Optional({ through: 'agenda://neighbourhoodUrl', resolveLanguage: 'literal' })
  neighbourhoodUrl: string = ''

  @Optional({ through: 'agenda://role', resolveLanguage: 'literal' })
  role: string = 'owner'
}

export const CALENDAR_META_ANNOTATIONS: ShapeAnnotations = {
  fields: {
    name: { label: 'Name', inputType: 'text', group: 'primary', order: 0 },
    color: { label: 'Color', inputType: 'text', group: 'primary', order: 1 },
    description: { label: 'Description', inputType: 'textarea', group: 'details', order: 2 },
    isDefault: { label: 'Default', inputType: 'hidden', group: 'system', order: -1 },
    isVisible: { label: 'Visible', inputType: 'hidden', group: 'system', order: -1 },
    neighbourhoodUrl: { label: 'Shared URL', inputType: 'hidden', group: 'system', order: -1 },
    role: { label: 'Role', inputType: 'select', group: 'system', order: -1, options: ['owner', 'editor', 'viewer'] }
  },
  defaults: {
    color: '#4285f4',
    isDefault: false,
    isVisible: true,
    role: 'owner'
  },
  rules: [],
  icsMapping: {}
}
```

#### Annotation Types

```typescript
/** data/annotations/types.ts */

export interface ShapeAnnotations {
  fields: Record<string, FieldAnnotation>
  defaults: Record<string, string | number | boolean>
  rules: ValidationRule[]
  icsMapping?: Record<string, string>
}

export interface FieldAnnotation {
  label: string
  inputType: InputType
  group: string
  order: number
  options?: string[]
}

export type InputType =
  | 'text'
  | 'textarea'
  | 'url'
  | 'datetime'
  | 'date'
  | 'time'
  | 'duration'
  | 'select'
  | 'rrule'
  | 'did-list'
  | 'calendar-select'
  | 'hidden'

export interface ValidationRule {
  type: 'comparison' | 'pattern' | 'custom'
  field: string
  operator?: '>' | '<' | '>=' | '<=' | '==' | '!='
  referenceField?: string
  pattern?: string
  message: string
}
```

#### Model Registry

```typescript
/** data/models/index.ts */

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
  AgendaEvent: { modelClass: AgendaEvent, annotations: EVENT_ANNOTATIONS },
  MeetingRequest: { modelClass: MeetingRequest, annotations: MEETING_REQUEST_ANNOTATIONS },
  FreeBusy: { modelClass: FreeBusy, annotations: FREE_BUSY_ANNOTATIONS },
  CalendarMeta: { modelClass: CalendarMeta, annotations: CALENDAR_META_ANNOTATIONS }
}

/** All model classes for registration */
export const ALL_MODELS = [AgendaEvent, MeetingRequest, FreeBusy, CalendarMeta]
```

### How the App Uses Models

```
┌─────────────────────────────────────────────┐
│                     UI                       │
│   ModelForm, WeekView, EventBlock, etc.     │
└──────────────────┬──────────────────────────┘
                   │ uses
┌──────────────────┴──────────────────────────┐
│         Ad4mModel static methods             │
│   AgendaEvent.create(perspective, data)      │
│   AgendaEvent.query(perspective).where(...)  │
│   event.save() / event.delete()              │
│   + annotations for validation + defaults    │
└──────────────────┬──────────────────────────┘
                   │ operates on
┌──────────────────┴──────────────────────────┐
│           PerspectiveProxy                   │
│   Links, subject classes, SDNA               │
│   Holochain P2P sync (neighbourhoods)        │
└─────────────────────────────────────────────┘
```

### Annotations Layer

Annotations sit between the model and the UI/transforms. The model defines _what_ properties exist (via decorators). Annotations define _how_ they behave in this application:

```typescript
/** data/annotations/defaults.ts */

import type { ShapeAnnotations } from './types'

/**
 * Apply annotation defaults to data before create.
 * Pure function — takes raw data, returns data with defaults merged.
 */
export function applyDefaults(data: Record<string, unknown>, annotations: ShapeAnnotations): Record<string, unknown> {
  const result = { ...data }
  for (const [key, defaultValue] of Object.entries(annotations.defaults)) {
    if (result[key] === undefined || result[key] === '') {
      result[key] = defaultValue
    }
  }
  return result
}
```

```typescript
/** data/annotations/validation-rules.ts */

import type { ShapeAnnotations, ValidationRule } from './types'

export interface ValidationError {
  field: string
  message: string
}

/**
 * Validate data against annotation rules.
 * Returns empty array if valid.
 */
export function validate(
  data: Record<string, unknown>,
  annotations: ShapeAnnotations,
  modelMetadata: { properties: Array<{ name: string; required: boolean }> }
): ValidationError[] {
  const errors: ValidationError[] = []

  // Check required fields (from model metadata)
  for (const prop of modelMetadata.properties) {
    if (prop.required && (data[prop.name] === undefined || data[prop.name] === '')) {
      const fieldAnnotation = annotations.fields[prop.name]
      errors.push({
        field: prop.name,
        message: `${fieldAnnotation?.label ?? prop.name} is required`
      })
    }
  }

  // Check annotation rules
  for (const rule of annotations.rules) {
    if (rule.type === 'comparison' && rule.referenceField && rule.operator) {
      const fieldVal = data[rule.field]
      const refVal = data[rule.referenceField]
      if (fieldVal !== undefined && refVal !== undefined) {
        if (!evaluateComparison(fieldVal, rule.operator, refVal)) {
          errors.push({ field: rule.field, message: rule.message })
        }
      }
    }
    if (rule.type === 'pattern' && rule.pattern) {
      const val = data[rule.field]
      if (val !== undefined && !new RegExp(rule.pattern).test(String(val))) {
        errors.push({ field: rule.field, message: rule.message })
      }
    }
  }

  return errors
}

function evaluateComparison(a: unknown, op: string, b: unknown): boolean {
  const av = String(a)
  const bv = String(b)
  switch (op) {
    case '>':
      return av > bv
    case '<':
      return av < bv
    case '>=':
      return av >= bv
    case '<=':
      return av <= bv
    case '==':
      return av === bv
    case '!=':
      return av !== bv
    default:
      return true
  }
}
```

```typescript
/** data/annotations/ics-mapping.ts */

import type { ShapeAnnotations } from './types'

/**
 * Map between ICS VEVENT fields and model property names.
 * Driven entirely by the icsMapping table in annotations.
 */
export function icsToModelData(
  veventFields: Record<string, string>,
  annotations: ShapeAnnotations
): Record<string, string> {
  const reverseMap: Record<string, string> = {}
  for (const [propName, icsField] of Object.entries(annotations.icsMapping ?? {})) {
    reverseMap[icsField] = propName
  }

  const result: Record<string, string> = {}
  for (const [icsField, value] of Object.entries(veventFields)) {
    const propName = reverseMap[icsField]
    if (propName) result[propName] = value
  }
  return result
}

export function modelDataToIcs(data: Record<string, unknown>, annotations: ShapeAnnotations): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [propName, icsField] of Object.entries(annotations.icsMapping ?? {})) {
    if (data[propName] !== undefined && data[propName] !== '') {
      result[icsField] = String(data[propName])
    }
  }
  return result
}
```

### Transforms (Pure Functions)

```typescript
/** data/transforms/ics.ts */

import ICAL from 'ical.js'
import { icsToModelData, modelDataToIcs } from '../annotations/ics-mapping'
import type { ShapeAnnotations } from '../annotations/types'

/**
 * Import VEVENT components from an ICS string.
 * Mapping is driven by the annotations table — no per-field code.
 */
export function importVEvents(icsString: string, annotations: ShapeAnnotations): Record<string, string>[] {
  const jcal = ICAL.parse(icsString)
  const comp = new ICAL.Component(jcal)
  const vevents = comp.getAllSubcomponents('vevent')

  return vevents.map((vevent) => {
    const event = new ICAL.Event(vevent)
    const fields: Record<string, string> = {}

    // Extract standard fields
    if (event.summary) fields['SUMMARY'] = event.summary
    if (event.startDate) fields['DTSTART'] = event.startDate.toICALString()
    if (event.endDate) fields['DTEND'] = event.endDate.toICALString()
    if (event.location) fields['LOCATION'] = event.location
    if (event.description) fields['DESCRIPTION'] = event.description
    if (event.uid) fields['UID'] = event.uid

    const organizer = vevent.getFirstPropertyValue('organizer')
    if (organizer) fields['ORGANIZER'] = String(organizer)

    const status = vevent.getFirstPropertyValue('status')
    if (status) fields['STATUS'] = String(status)

    const rrule = vevent.getFirstPropertyValue('rrule')
    if (rrule) fields['RRULE'] = rrule.toString()

    const valarm = vevent.getFirstSubcomponent('valarm')
    if (valarm) {
      const trigger = valarm.getFirstPropertyValue('trigger')
      if (trigger) fields['VALARM.TRIGGER'] = trigger.toString()
    }

    // Map via annotations table
    return icsToModelData(fields, annotations)
  })
}

/**
 * Export model data to an ICS string.
 */
export function exportVEvents(events: Record<string, unknown>[], annotations: ShapeAnnotations): string {
  const cal = new ICAL.Component(['vcalendar', [], []])
  cal.updatePropertyWithValue('prodid', '-//Agenda//EN')
  cal.updatePropertyWithValue('version', '2.0')

  for (const eventData of events) {
    const icsFields = modelDataToIcs(eventData, annotations)

    const vevent = new ICAL.Component('vevent')

    if (!icsFields['UID']) {
      icsFields['UID'] = crypto.randomUUID() + '@agenda'
    }

    // Set fields on vevent component
    if (icsFields['SUMMARY']) vevent.updatePropertyWithValue('summary', icsFields['SUMMARY'])
    if (icsFields['DTSTART']) vevent.updatePropertyWithValue('dtstart', ICAL.Time.fromString(icsFields['DTSTART']))
    if (icsFields['DTEND']) vevent.updatePropertyWithValue('dtend', ICAL.Time.fromString(icsFields['DTEND']))
    if (icsFields['LOCATION']) vevent.updatePropertyWithValue('location', icsFields['LOCATION'])
    if (icsFields['DESCRIPTION']) vevent.updatePropertyWithValue('description', icsFields['DESCRIPTION'])
    if (icsFields['UID']) vevent.updatePropertyWithValue('uid', icsFields['UID'])
    if (icsFields['STATUS']) vevent.updatePropertyWithValue('status', icsFields['STATUS'])
    if (icsFields['ORGANIZER']) vevent.updatePropertyWithValue('organizer', icsFields['ORGANIZER'])

    cal.addSubcomponent(vevent)
  }

  return cal.toString()
}
```

```typescript
/** data/transforms/rrule.ts */

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

  let next = iterator.next()
  while (next) {
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
```

```typescript
/** data/transforms/freebusy-gen.ts */

export interface FreeBusySlot {
  startDate: string
  endDate: string
  busyType: 'free' | 'busy' | 'tentative'
}

/**
 * Project events to free/busy slots.
 * Pure function — no AD4M dependency.
 */
export function eventsToFreeBusy(
  events: Array<{ startDate: string; endDate: string; status: string; visibility: string }>
): FreeBusySlot[] {
  return events
    .filter((e) => e.visibility !== 'private' || true) // All events generate busy slots
    .map((e) => ({
      startDate: e.startDate,
      endDate: e.endDate,
      busyType:
        e.status === 'EventCancelled'
          ? ('free' as const)
          : e.status === 'EventPostponed'
            ? ('tentative' as const)
            : ('busy' as const)
    }))
}
```

```typescript
/** data/transforms/slot-finder.ts */

import type { FreeBusySlot } from './freebusy-gen'

export interface FreeSlot {
  startDate: string
  endDate: string
}

/**
 * Find mutual free slots across multiple FreeBusy sets.
 * Pure function.
 */
export function findMutualFreeSlots(
  freeBusySets: FreeBusySlot[][],
  windowStart: Date,
  windowEnd: Date,
  minDurationMs: number
): FreeSlot[] {
  // Merge all busy periods
  const allBusy = freeBusySets
    .flat()
    .filter((s) => s.busyType !== 'free')
    .map((s) => ({ start: new Date(s.startDate).getTime(), end: new Date(s.endDate).getTime() }))
    .sort((a, b) => a.start - b.start)

  // Merge overlapping busy periods
  const merged: Array<{ start: number; end: number }> = []
  for (const period of allBusy) {
    const last = merged[merged.length - 1]
    if (last && period.start <= last.end) {
      last.end = Math.max(last.end, period.end)
    } else {
      merged.push({ ...period })
    }
  }

  // Find gaps
  const slots: FreeSlot[] = []
  let cursor = windowStart.getTime()

  for (const busy of merged) {
    if (busy.start > cursor && busy.start - cursor >= minDurationMs) {
      slots.push({
        startDate: new Date(cursor).toISOString(),
        endDate: new Date(busy.start).toISOString()
      })
    }
    cursor = Math.max(cursor, busy.end)
  }

  const windowEndMs = windowEnd.getTime()
  if (windowEndMs > cursor && windowEndMs - cursor >= minDurationMs) {
    slots.push({
      startDate: new Date(cursor).toISOString(),
      endDate: new Date(windowEndMs).toISOString()
    })
  }

  return slots
}
```

### Pipelines

```typescript
/** data/pipelines/visible-events.ts */

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
  // 1. Query all events in the date range
  const events = (await AgendaEvent.query(perspective).where({}).run()) as AgendaEvent[]

  // 2. Filter to window + visible calendars
  const inRange = events.filter((e) => {
    if (!visibleCalendarIds.has(e.calendarId)) return false
    const start = new Date(e.startDate)
    const end = new Date(e.endDate)
    // Include if overlaps window or has recurrence
    return (start <= windowEnd && end >= windowStart) || e.recurrence
  })

  // 3. Expand recurrences
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
```

```typescript
/** data/pipelines/availability.ts */

import type { PerspectiveProxy } from '@coasys/ad4m'
import { AgendaEvent } from '../models/event'
import { FreeBusy as FreeBusyModel } from '../models/freebusy'
import { eventsToFreeBusy, type FreeBusySlot } from '../transforms/freebusy-gen'

/**
 * Pipeline: events → free/busy slots → publish as FreeBusy instances
 */
export async function publishAvailability(
  perspective: PerspectiveProxy,
  ownerDid: string,
  windowStart: Date,
  windowEnd: Date
): Promise<void> {
  // 1. Query all events in window
  const events = (await AgendaEvent.query(perspective).run()) as AgendaEvent[]

  const inRange = events.filter((e) => {
    const start = new Date(e.startDate)
    const end = new Date(e.endDate)
    return start <= windowEnd && end >= windowStart
  })

  // 2. Generate free/busy slots
  const slots = eventsToFreeBusy(
    inRange.map((e) => ({
      startDate: e.startDate,
      endDate: e.endDate,
      status: e.status,
      visibility: e.visibility
    }))
  )

  // 3. Publish as FreeBusy model instances
  for (const slot of slots) {
    await FreeBusyModel.create(perspective, {
      startDate: slot.startDate,
      endDate: slot.endDate,
      busyType: slot.busyType,
      owner: ownerDid
    })
  }
}
```

---

## Layer 1: Personal Calendar UI

### `ui/forms/ModelForm.tsx`

```typescript
import type { PerspectiveProxy } from '@coasys/ad4m'
import type { ShapeAnnotations, FieldAnnotation } from '../../data/annotations/types'
import { FieldRenderer } from './FieldRenderer'

/**
 * Renders a form from any Ad4mModel's metadata + annotations.
 * No model-specific code — entirely data-driven.
 *
 * Props:
 *   modelClass — the Ad4mModel class (AgendaEvent, MeetingRequest, etc.)
 *   annotations — the ShapeAnnotations for this model
 *   data — current form data (SolidJS store)
 *   onUpdate — called when a field changes
 *   groups — optional filter to show only certain groups
 */
interface ModelFormProps {
  modelClass: any
  annotations: ShapeAnnotations
  data: Record<string, unknown>
  onUpdate: (field: string, value: unknown) => void
  groups?: string[]
}

export function ModelForm(props: ModelFormProps) {
  const fields = () => {
    const metadata = props.modelClass.getModelMetadata()
    const entries = Object.entries(props.annotations.fields)
      .filter(([name, ann]) => {
        if (ann.inputType === 'hidden') return false
        if (props.groups && !props.groups.includes(ann.group)) return false
        return true
      })
      .sort(([, a], [, b]) => a.order - b.order)
    return entries
  }

  return (
    <div class="space-y-4">
      <For each={fields()}>
        {([name, annotation]) => (
          <FieldRenderer
            name={name}
            annotation={annotation}
            value={props.data[name]}
            onUpdate={(value) => props.onUpdate(name, value)}
          />
        )}
      </For>
    </div>
  )
}
```

### `ui/events/EventDetail.tsx`

```typescript
import { createStore } from 'solid-js/store'
import { useAd4m, usePerspective } from '../../data/context/ad4m-context'
import { AgendaEvent, EVENT_ANNOTATIONS } from '../../data/models/event'
import { MODEL_REGISTRY } from '../../data/models'
import { applyDefaults } from '../../data/annotations/defaults'
import { validate } from '../../data/annotations/validation-rules'
import { ModelForm } from '../forms/ModelForm'

interface EventDetailProps {
  event?: AgendaEvent | null  // null = creating new
  onClose: () => void
}

export function EventDetail(props: EventDetailProps) {
  const perspective = usePerspective()
  const { client } = useAd4m()

  const [data, setData] = createStore<Record<string, unknown>>(
    props.event
      ? { name: props.event.name, startDate: props.event.startDate, /* ... */ }
      : applyDefaults({}, EVENT_ANNOTATIONS),
  )
  const [errors, setErrors] = createSignal<string[]>([])

  const handleSave = async () => {
    const metadata = AgendaEvent.getModelMetadata()
    const validationErrors = validate(data, EVENT_ANNOTATIONS, metadata)
    if (validationErrors.length > 0) {
      setErrors(validationErrors.map(e => e.message))
      return
    }

    if (props.event) {
      // Update existing
      Object.assign(props.event, data)
      await props.event.save()
    } else {
      // Create new
      const myDid = (await client()!.agent.me()).did
      await AgendaEvent.create(perspective(), {
        ...data,
        organizer: myDid,
      })
    }

    props.onClose()
  }

  return (
    <div class="p-4">
      <ModelForm
        modelClass={AgendaEvent}
        annotations={EVENT_ANNOTATIONS}
        data={data}
        onUpdate={(field, value) => setData(field, value)}
      />
      <Show when={errors().length > 0}>
        <div class="text-red-500 mt-2">
          <For each={errors()}>{msg => <p>{msg}</p>}</For>
        </div>
      </Show>
      <div class="flex gap-2 mt-4">
        <button class="btn-primary" onClick={handleSave}>Save</button>
        <button class="btn-secondary" onClick={props.onClose}>Cancel</button>
        <Show when={props.event}>
          <button class="btn-danger" onClick={async () => {
            await props.event!.delete()
            props.onClose()
          }}>Delete</button>
        </Show>
      </div>
    </div>
  )
}
```

### `ui/state/event-state.ts`

```typescript
import { createSignal, onCleanup } from 'solid-js'
import type { PerspectiveProxy } from '@coasys/ad4m'
import { AgendaEvent } from '../../data/models/event'
import { getVisibleEvents, type VisibleEvent } from '../../data/pipelines/visible-events'

/**
 * Reactive event state. Subscribes to AgendaEvent changes via Ad4mModel
 * subscriptions and re-runs the visible-events pipeline.
 */
export function createEventState(
  perspective: () => PerspectiveProxy,
  windowStart: () => Date,
  windowEnd: () => Date,
  visibleCalendarIds: () => Set<string>
) {
  const [events, setEvents] = createSignal<VisibleEvent[]>([])

  // Subscribe to model changes
  const unsub = AgendaEvent.query(perspective()).subscribe(async () => {
    const visible = await getVisibleEvents(perspective(), windowStart(), windowEnd(), visibleCalendarIds())
    setEvents(visible)
  })

  // Initial load
  getVisibleEvents(perspective(), windowStart(), windowEnd(), visibleCalendarIds()).then(setEvents)

  onCleanup(unsub)

  return events
}
```

---

## Layer 2: Person-to-Person Scheduling

### `scheduling/invite-flow.ts`

```typescript
import type { Ad4mClient, PerspectiveProxy } from '@coasys/ad4m'
import { MeetingRequest } from '../data/models/meeting-request'
import { AgendaEvent } from '../data/models/event'

/**
 * Send a meeting invite:
 * 1. Create a neighbourhood (shared perspective) for the request
 * 2. Create a MeetingRequest instance in the neighbourhood
 * 3. The attendee joins the neighbourhood to see the request
 */
export async function sendInvite(
  client: Ad4mClient,
  localPerspective: PerspectiveProxy,
  eventUri: string,
  attendeeDids: string[]
): Promise<{ neighbourhoodUrl: string; requestUri: string }> {
  // Create a new perspective for this invite exchange
  const invitePerspective = await client.perspective.add('invite')

  // Register models on the invite perspective
  await invitePerspective.ensureSDNASubjectClass(MeetingRequest)
  await invitePerspective.ensureSDNASubjectClass(AgendaEvent)

  // Publish as neighbourhood so attendees can join
  const neighbourhoodUrl = await invitePerspective.publishFromPerspective(
    'lang://social-context', // link language for P2P sync
    { links: [] }
  )

  // Create the meeting request
  const myDid = (await client.agent.me()).did
  const request = await MeetingRequest.create(invitePerspective, {
    eventRef: eventUri,
    organizer: myDid,
    attendees: attendeeDids,
    status: 'pending',
    dateCreated: new Date().toISOString()
  })

  return { neighbourhoodUrl, requestUri: request.baseExpression }
}

/**
 * Respond to a meeting request.
 */
export async function respondToInvite(
  perspective: PerspectiveProxy,
  requestUri: string,
  response: 'accepted' | 'declined' | 'tentative'
): Promise<void> {
  const requests = (await MeetingRequest.query(perspective).run()) as MeetingRequest[]
  const request = requests.find((r) => r.baseExpression === requestUri)
  if (!request) throw new Error(`Request ${requestUri} not found`)

  request.status = response
  await request.save()
}
```

### `scheduling/request-transitions.ts`

```typescript
/**
 * Declarative state machine for meeting request status transitions.
 * Each entry: [currentState, action] → newState
 * The transition table is the source of truth — no imperative state logic.
 */

export interface Transition {
  from: string
  action: string
  to: string
  allowedBy: 'organizer' | 'attendee' | 'any'
}

export const REQUEST_TRANSITIONS: Transition[] = [
  { from: 'pending', action: 'accept', to: 'accepted', allowedBy: 'attendee' },
  { from: 'pending', action: 'decline', to: 'declined', allowedBy: 'attendee' },
  { from: 'pending', action: 'tentative', to: 'tentative', allowedBy: 'attendee' },
  { from: 'pending', action: 'cancel', to: 'cancelled', allowedBy: 'organizer' },
  { from: 'accepted', action: 'cancel', to: 'cancelled', allowedBy: 'organizer' },
  { from: 'accepted', action: 'decline', to: 'declined', allowedBy: 'attendee' },
  { from: 'tentative', action: 'accept', to: 'accepted', allowedBy: 'attendee' },
  { from: 'tentative', action: 'decline', to: 'declined', allowedBy: 'attendee' },
  { from: 'tentative', action: 'cancel', to: 'cancelled', allowedBy: 'organizer' }
]

export function getAvailableActions(currentStatus: string, role: 'organizer' | 'attendee'): string[] {
  return REQUEST_TRANSITIONS.filter(
    (t) => t.from === currentStatus && (t.allowedBy === role || t.allowedBy === 'any')
  ).map((t) => t.action)
}

export function applyTransition(currentStatus: string, action: string, role: 'organizer' | 'attendee'): string {
  const transition = REQUEST_TRANSITIONS.find(
    (t) => t.from === currentStatus && t.action === action && (t.allowedBy === role || t.allowedBy === 'any')
  )
  if (!transition) throw new Error(`Invalid transition: ${currentStatus} + ${action} by ${role}`)
  return transition.to
}
```

---

## Layer 3: Free/Busy

Free/busy generation and slot finding are pure transforms (already defined in `data/transforms/`). The pipeline in `data/pipelines/availability.ts` connects them to the AD4M models.

For sharing free/busy with others:

```typescript
/** Layer 3: Publish free/busy to a shared neighbourhood */

import type { Ad4mClient, PerspectiveProxy } from '@coasys/ad4m'
import { FreeBusy } from '../data/models/freebusy'
import { publishAvailability } from '../data/pipelines/availability'

/**
 * Create a free/busy neighbourhood and publish availability.
 * Others can join this neighbourhood to see your free/busy slots.
 */
export async function shareAvailability(
  client: Ad4mClient,
  localPerspective: PerspectiveProxy,
  ownerDid: string,
  windowStart: Date,
  windowEnd: Date
): Promise<string> {
  // Create a dedicated perspective for free/busy sharing
  const fbPerspective = await client.perspective.add('free-busy')
  await fbPerspective.ensureSDNASubjectClass(FreeBusy)

  // Publish as neighbourhood
  const url = await fbPerspective.publishFromPerspective('lang://social-context', { links: [] })

  // Generate and publish slots
  await publishAvailability(localPerspective, ownerDid, windowStart, windowEnd)

  return url
}

/**
 * Overlay another person's free/busy onto your calendar.
 */
export async function overlayFreeBusy(
  client: Ad4mClient,
  neighbourhoodUrl: string
): Promise<Array<{ startDate: string; endDate: string; busyType: string }>> {
  const perspective = await client.neighbourhood.joinFromUrl(neighbourhoodUrl)
  await perspective.ensureSDNASubjectClass(FreeBusy)

  const slots = (await FreeBusy.query(perspective).run()) as FreeBusy[]
  return slots.map((s) => ({
    startDate: s.startDate,
    endDate: s.endDate,
    busyType: s.busyType
  }))
}
```

---

## Layer 4: Shared Calendars via Neighbourhoods

### `shared/shared-calendar-ops.ts`

```typescript
import type { Ad4mClient, PerspectiveProxy } from '@coasys/ad4m'
import { AgendaEvent } from '../data/models/event'
import { CalendarMeta } from '../data/models/calendar-meta'

/**
 * Create a shared calendar:
 * 1. Create a new perspective
 * 2. Register AgendaEvent + CalendarMeta models
 * 3. Publish as neighbourhood
 * 4. Create CalendarMeta instance in local perspective (for sidebar)
 */
export async function createSharedCalendar(
  client: Ad4mClient,
  localPerspective: PerspectiveProxy,
  name: string,
  color: string
): Promise<{ perspective: PerspectiveProxy; url: string }> {
  const perspective = await client.perspective.add(name)

  await perspective.ensureSDNASubjectClass(AgendaEvent)
  await perspective.ensureSDNASubjectClass(CalendarMeta)

  const url = await perspective.publishFromPerspective('lang://social-context', { links: [] })

  // Record in local perspective
  await CalendarMeta.create(localPerspective, {
    name,
    color,
    neighbourhoodUrl: url,
    role: 'owner',
    isVisible: true
  })

  return { perspective, url }
}

/**
 * Join a shared calendar by neighbourhood URL.
 */
export async function joinSharedCalendar(
  client: Ad4mClient,
  localPerspective: PerspectiveProxy,
  url: string,
  name: string,
  color: string
): Promise<PerspectiveProxy> {
  const perspective = await client.neighbourhood.joinFromUrl(url)

  await perspective.ensureSDNASubjectClass(AgendaEvent)
  await perspective.ensureSDNASubjectClass(CalendarMeta)

  await CalendarMeta.create(localPerspective, {
    name,
    color,
    neighbourhoodUrl: url,
    role: 'viewer',
    isVisible: true
  })

  return perspective
}

/**
 * Leave a shared calendar.
 */
export async function leaveSharedCalendar(
  client: Ad4mClient,
  localPerspective: PerspectiveProxy,
  calendarMetaUri: string
): Promise<void> {
  const metas = (await CalendarMeta.query(localPerspective).run()) as CalendarMeta[]
  const meta = metas.find((m) => m.baseExpression === calendarMetaUri)
  if (meta) {
    // TODO: AD4M doesn't have a "leave neighbourhood" — remove perspective
    await meta.delete()
  }
}
```

### `shared/governance-rules.ts`

```typescript
/**
 * Declarative governance table for shared calendars.
 * Maps role → set of allowed operations.
 * The table is the source of truth — no scattered permission checks.
 */

export type Role = 'owner' | 'editor' | 'viewer'
export type Operation =
  | 'create_event'
  | 'edit_event'
  | 'delete_event'
  | 'invite_member'
  | 'remove_member'
  | 'change_role'
  | 'delete_calendar'

export const GOVERNANCE_TABLE: Record<Role, Set<Operation>> = {
  owner: new Set([
    'create_event',
    'edit_event',
    'delete_event',
    'invite_member',
    'remove_member',
    'change_role',
    'delete_calendar'
  ]),
  editor: new Set(['create_event', 'edit_event', 'delete_event']),
  viewer: new Set([])
}

export function isAllowed(role: Role, operation: Operation): boolean {
  return GOVERNANCE_TABLE[role]?.has(operation) ?? false
}

export function getAllowedOperations(role: Role): Operation[] {
  return [...(GOVERNANCE_TABLE[role] ?? [])]
}
```

---

## Layer 5: Onboarding

### `onboarding/import-wizard.ts`

```typescript
import type { PerspectiveProxy } from '@coasys/ad4m'
import { AgendaEvent, EVENT_ANNOTATIONS } from '../data/models/event'
import { importVEvents } from '../data/transforms/ics'
import { applyDefaults } from '../data/annotations/defaults'
import { validate } from '../data/annotations/validation-rules'

/**
 * Import ICS file → AgendaEvent instances.
 * Pipeline: file → parse → map via annotations → validate → create
 */
export async function importIcsFile(
  perspective: PerspectiveProxy,
  icsString: string,
  calendarId: string,
  organizerDid: string
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const records = importVEvents(icsString, EVENT_ANNOTATIONS)

  let imported = 0
  let skipped = 0
  const errors: string[] = []

  for (const record of records) {
    const data = applyDefaults({ ...record, calendarId, organizer: organizerDid }, EVENT_ANNOTATIONS)

    const metadata = AgendaEvent.getModelMetadata()
    const validationErrors = validate(data, EVENT_ANNOTATIONS, metadata)
    if (validationErrors.length > 0) {
      skipped++
      errors.push(`Skipped event "${data.name}": ${validationErrors.map((e) => e.message).join(', ')}`)
      continue
    }

    await AgendaEvent.create(perspective, data)
    imported++
  }

  return { imported, skipped, errors }
}
```

### `onboarding/natural-language.ts`

```typescript
/**
 * Quick-add: parse a natural language string into partial event fields.
 * Pure function — pattern matching only, no AI/LLM.
 */

export interface PartialEvent {
  name?: string
  startDate?: string
  endDate?: string
  location?: string
}

const PATTERNS = [
  // "Coffee with Nico tomorrow at 10am"
  { regex: /^(.+?)\s+(?:tomorrow|tmrw)\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i, extract: extractTomorrow },
  // "Lunch at noon at Federation Square"
  { regex: /^(.+?)\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s+at\s+(.+)/i, extract: extractWithLocation },
  // "Meeting 2pm-3pm"
  {
    regex: /^(.+?)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[-–]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
    extract: extractTimeRange
  }
]

export function parseQuickAdd(input: string): PartialEvent {
  for (const pattern of PATTERNS) {
    const match = input.match(pattern.regex)
    if (match) return pattern.extract(match)
  }
  return { name: input }
}

function extractTomorrow(match: RegExpMatchArray): PartialEvent {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return { name: match[1].trim(), startDate: formatWithTime(tomorrow, match[2]) }
}

function extractWithLocation(match: RegExpMatchArray): PartialEvent {
  return { name: match[1].trim(), startDate: match[2], location: match[3].trim() }
}

function extractTimeRange(match: RegExpMatchArray): PartialEvent {
  return { name: match[1].trim(), startDate: match[2], endDate: match[3] }
}

function formatWithTime(date: Date, time: string): string {
  // Parse time string and combine with date
  const [, hours, minutes, ampm] = time.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i) ?? []
  let h = parseInt(hours)
  if (ampm?.toLowerCase() === 'pm' && h < 12) h += 12
  if (ampm?.toLowerCase() === 'am' && h === 12) h = 0
  date.setHours(h, parseInt(minutes ?? '0'), 0, 0)
  return date.toISOString()
}
```

---

## Tests

```
tests/
├── models/
│   ├── model-registration.test.ts
│   ├── event-crud.test.ts
│   ├── meeting-request-crud.test.ts
│   └── freebusy-crud.test.ts
├── annotations/
│   ├── validation.test.ts
│   ├── defaults.test.ts
│   └── ics-mapping.test.ts
├── transforms/
│   ├── ics.test.ts
│   ├── rrule.test.ts
│   ├── freebusy.test.ts
│   └── slot-finder.test.ts
├── pipelines/
│   └── pipeline.test.ts
├── scheduling/
│   ├── transitions.test.ts
│   └── invite-flow.test.ts
├── shared/
│   ├── governance.test.ts
│   └── shared-calendar.test.ts
├── onboarding/
│   ├── import.test.ts
│   └── natural-language.test.ts
└── invariants/
    └── declarative-invariants.test.ts
```

All tests mock `PerspectiveProxy` methods rather than requiring a running AD4M executor. The mock provides:

```typescript
/** tests/helpers/mock-perspective.ts */

import type { PerspectiveProxy } from '@coasys/ad4m'

/**
 * Create a mock PerspectiveProxy for testing.
 * Stores links in memory, supports subject class operations.
 */
export function createMockPerspective(): PerspectiveProxy {
  const links: Array<{ source: string; predicate: string; target: string }> = []
  const subjectClasses = new Map<string, any>()
  const instances = new Map<string, Record<string, unknown>>()
  const subscribers: Array<(links: any[]) => void> = []

  return {
    uuid: 'mock-' + crypto.randomUUID(),
    name: 'test',

    async ensureSDNASubjectClass(modelClass: any) {
      subjectClasses.set(modelClass.name, modelClass)
    },

    async addLink(link: any) {
      links.push(link)
      subscribers.forEach((cb) => cb(links))
      return link
    },

    async removeLink(link: any) {
      const idx = links.findIndex(
        (l) => l.source === link.source && l.predicate === link.predicate && l.target === link.target
      )
      if (idx >= 0) links.splice(idx, 1)
    },

    async get(query: any) {
      return links.filter((l) => {
        if (query.source && l.source !== query.source) return false
        if (query.predicate && l.predicate !== query.predicate) return false
        if (query.target && l.target !== query.target) return false
        return true
      })
    }

    // ... enough to support Ad4mModel operations in tests
  } as unknown as PerspectiveProxy
}
```

### `models/model-registration.test.ts` — Model Registration & Integrity

| # | Test | Level | Description |
| --- | --- | --- | --- |
| MR-01 | `Every model in MODEL_REGISTRY MUST have a modelClass with @Model decorator` | MUST | Non-null modelClass with name. |
| MR-02 | `Every model MUST have annotations in the registry` | MUST | Both modelClass and annotations present. |
| MR-03 | `AgendaEvent.getModelMetadata() MUST return all decorated properties` | MUST | name, startDate, endDate, location, etc. all present. |
| MR-04 | `Model property names MUST be unique within each model` | MUST | No duplicates in metadata. |
| MR-05 | `Every model property MUST have a valid predicate URI (schema:// or agenda://)` | MUST | No typos in `through` paths. |
| MR-06 | `Every model property MUST have a corresponding field annotation` | MUST | Annotations cover all properties. |
| MR-07 | `Annotation defaults MUST only reference declared property names` | MUST | No phantom defaults. |
| MR-08 | `Annotation validation rules MUST only reference declared property names` | MUST | Both field and referenceField exist in model. |
| MR-09 | `ICS mapping keys MUST only reference declared property names` | MUST | No orphan mappings. |
| MR-10 | `ensureSDNASubjectClass() MUST not throw for any model` | MUST | All models register cleanly on a mock perspective. |
| MR-11 | `@Property with required: true MUST appear as required in metadata` | MUST | name, startDate, endDate are required. |
| MR-12 | `@Optional MUST appear as not required in metadata` | MUST | location, description are optional. |
| MR-13 | `@HasMany MUST appear as collection in metadata` | MUST | attendees is a collection. |
| MR-14 | `@ReadOnly MUST appear as read-only in metadata` | MUST | organizer is read-only. |
| MR-15 | `@Flag MUST appear as boolean in metadata` | MUST | CalendarMeta.isDefault is a flag. |

### `models/event-crud.test.ts` — AgendaEvent CRUD (mocked perspective)

| # | Test | Level | Description |
| --- | --- | --- | --- |
| EC-01 | `AgendaEvent.create() MUST persist and return an instance` | MUST | Round-trip via mock perspective. |
| EC-02 | `AgendaEvent.create() MUST set all provided properties` | MUST | name, startDate, endDate, calendarId all set. |
| EC-03 | `AgendaEvent.query(perspective).run() MUST return created instances` | MUST | Create 3 events, query returns 3. |
| EC-04 | `AgendaEvent.query(perspective).where({ calendarId: "work" }).run() MUST filter` | MUST | Only work calendar events returned. |
| EC-05 | `event.save() MUST persist property changes` | MUST | Change name, save, re-query → updated. |
| EC-06 | `event.delete() MUST remove the instance` | MUST | After delete, query no longer returns it. |
| EC-07 | `AgendaEvent.create() with missing required field MUST throw` | MUST | Omitting name → error. |
| EC-08 | `Two creates MUST produce distinct instances` | MUST | Different baseExpression values. |
| EC-09 | `Updating one event MUST NOT affect others` | MUST | Change event A, event B unchanged. |
| EC-10 | `AgendaEvent.query(perspective).subscribe() MUST call back on changes` | MUST | Create after subscribe → callback fires. |

### `models/meeting-request-crud.test.ts` — MeetingRequest CRUD

| # | Test | Level | Description |
| --- | --- | --- | --- |
| MRC-01 | `MeetingRequest.create() MUST persist and return an instance` | MUST | Round-trip. |
| MRC-02 | `MeetingRequest status MUST default to "pending"` | MUST | Via annotation defaults. |
| MRC-03 | `MeetingRequest.query() MUST return created requests` | MUST | Create 2, query returns 2. |
| MRC-04 | `Updating status via save() MUST persist` | MUST | pending → accepted → query shows accepted. |
| MRC-05 | `MeetingRequest attendees (HasMany) MUST support multiple values` | MUST | 3 attendees → all present. |
| MRC-06 | `MeetingRequest.delete() MUST remove the instance` | MUST | After delete, query no longer returns it. |

### `models/freebusy-crud.test.ts` — FreeBusy CRUD

| #     | Test                                                    | Level | Description                               |
| ----- | ------------------------------------------------------- | ----- | ----------------------------------------- |
| FB-01 | `FreeBusy.create() MUST persist and return an instance` | MUST  | Round-trip.                               |
| FB-02 | `FreeBusy busyType MUST default to "busy"`              | MUST  | Via annotation defaults.                  |
| FB-03 | `FreeBusy.query() MUST return created slots`            | MUST  | Create 3, query returns 3.                |
| FB-04 | `FreeBusy.delete() MUST remove the instance`            | MUST  | After delete, query no longer returns it. |

### `annotations/validation.test.ts` — Declarative Validation

| # | Test | Level | Description |
| --- | --- | --- | --- |
| VL-01 | `validate() MUST check required properties from model metadata` | MUST | Missing `name` → error. |
| VL-02 | `validate() MUST evaluate comparison rules` | MUST | endDate ≤ startDate → error. |
| VL-03 | `validate() MUST return empty array when valid` | MUST | Good data → `[]`. |
| VL-04 | `validate() MUST work for any model's metadata + annotations` | MUST | Not Event-specific. |
| VL-05 | `Adding a rule to annotations MUST be enforced without code changes` | MUST | Declarative extensibility. |
| VL-06 | `validate() MUST check pattern rules when present` | MUST | Invalid pattern → error. |
| VL-07 | `validate() MUST return all errors, not just the first` | MUST | Multiple issues → multiple errors. |

### `annotations/defaults.test.ts` — Default Application

| # | Test | Level | Description |
| --- | --- | --- | --- |
| DF-01 | `applyDefaults() MUST fill missing fields from annotation defaults` | MUST | Empty status → "EventScheduled". |
| DF-02 | `applyDefaults() MUST NOT overwrite provided values` | MUST | Explicit status = "EventCancelled" preserved. |
| DF-03 | `applyDefaults() MUST handle empty string as missing` | MUST | status = "" → default applied. |
| DF-04 | `applyDefaults() MUST work for any model's annotations` | MUST | Not Event-specific. |

### `annotations/ics-mapping.test.ts` — ICS Mapping

| #     | Test                                                         | Level | Description                       |
| ----- | ------------------------------------------------------------ | ----- | --------------------------------- |
| IM-01 | `icsToModelData() MUST map via icsMapping table`             | MUST  | Table-driven, not per-field.      |
| IM-02 | `icsToModelData() MUST ignore unmapped ICS fields`           | MUST  | Unknown ICS fields dropped.       |
| IM-03 | `modelDataToIcs() MUST map via icsMapping table`             | MUST  | Reverse direction.                |
| IM-04 | `modelDataToIcs() MUST skip empty/undefined values`          | MUST  | No blank ICS fields.              |
| IM-05 | `Round-trip MUST preserve mapped fields`                     | MUST  | model → ics → model = equivalent. |
| IM-06 | `Adding a mapping entry MUST be sufficient (no code change)` | MUST  | Key declarative test.             |

### `transforms/ics.test.ts` — ICS Import/Export

| #    | Test                                                         | Level | Description                            |
| ---- | ------------------------------------------------------------ | ----- | -------------------------------------- |
| I-01 | `importVEvents() MUST parse valid ICS and return model data` | MUST  | Standard VEVENT → record.              |
| I-02 | `importVEvents() MUST convert ICS datetime to ISO 8601`      | MUST  | Format conversion.                     |
| I-03 | `importVEvents() MUST ignore unmapped ICS fields`            | MUST  | Silent drop.                           |
| I-04 | `importVEvents() MUST handle multiple VEVENTs`               | MUST  | N inputs → N outputs.                  |
| I-05 | `exportVEvents() MUST produce valid iCalendar`               | MUST  | Correct wrapper.                       |
| I-06 | `exportVEvents() MUST generate UID if absent`                | MUST  | Every VEVENT needs UID.                |
| I-07 | `Round-trip MUST preserve core fields`                       | MUST  | Import → export → import = equivalent. |
| I-08 | `importVEvents() MUST handle VALARM trigger`                 | MUST  | Reminder mapping.                      |
| I-09 | `importVEvents() MUST handle RRULE`                          | MUST  | Recurrence mapping.                    |

### `transforms/rrule.test.ts` — Recurrence Expansion

| #    | Test                                                              | Level  | Description             |
| ---- | ----------------------------------------------------------------- | ------ | ----------------------- |
| R-01 | `parseRRule() MUST parse FREQ=DAILY`                              | MUST   | freq = "DAILY".         |
| R-02 | `parseRRule() MUST parse FREQ=WEEKLY with BYDAY`                  | MUST   | byDay populated.        |
| R-03 | `parseRRule() MUST parse FREQ=MONTHLY`                            | MUST   | freq = "MONTHLY".       |
| R-04 | `parseRRule() MUST parse FREQ=YEARLY`                             | MUST   | freq = "YEARLY".        |
| R-05 | `parseRRule() MUST parse INTERVAL`                                | MUST   | interval = N.           |
| R-06 | `parseRRule() MUST parse COUNT`                                   | MUST   | count = N.              |
| R-07 | `parseRRule() MUST parse UNTIL`                                   | MUST   | until = Date.           |
| R-08 | `expandOccurrences() daily: 7-day window → 7 occurrences`         | MUST   | Correct count.          |
| R-09 | `expandOccurrences() weekly BYDAY=MO,WE: 2 weeks → 4 occurrences` | MUST   | Correct count.          |
| R-10 | `expandOccurrences() MUST respect COUNT`                          | MUST   | Stops at N.             |
| R-11 | `expandOccurrences() MUST respect UNTIL`                          | MUST   | Stops at date.          |
| R-12 | `expandOccurrences() MUST NOT generate outside window`            | MUST   | Only in range.          |
| R-13 | `expandOccurrences() MUST handle timezone offsets`                | MUST   | TZ-aware.               |
| R-14 | `expandOccurrences() SHOULD handle EXDATE`                        | SHOULD | Excluded dates skipped. |
| R-15 | `expandOccurrences() MUST set parentUri`                          | MUST   | Links to source event.  |

### `transforms/freebusy.test.ts` — Free/Busy Generation

| #      | Test                                                        | Level | Description                 |
| ------ | ----------------------------------------------------------- | ----- | --------------------------- |
| FBT-01 | `eventsToFreeBusy() MUST map active events to busy slots`   | MUST  | EventScheduled → busy.      |
| FBT-02 | `eventsToFreeBusy() MUST map cancelled events to free`      | MUST  | EventCancelled → free.      |
| FBT-03 | `eventsToFreeBusy() MUST map postponed events to tentative` | MUST  | EventPostponed → tentative. |
| FBT-04 | `eventsToFreeBusy() MUST preserve start/end times`          | MUST  | Times match source event.   |
| FBT-05 | `eventsToFreeBusy() with empty input MUST return empty`     | MUST  | No events → no slots.       |

### `transforms/slot-finder.test.ts` — Mutual Slot Finding

| #     | Test                                                                        | Level | Description          |
| ----- | --------------------------------------------------------------------------- | ----- | -------------------- |
| SF-01 | `findMutualFreeSlots() with no busy periods MUST return entire window`      | MUST  | All free.            |
| SF-02 | `findMutualFreeSlots() MUST exclude busy periods`                           | MUST  | Gaps only.           |
| SF-03 | `findMutualFreeSlots() MUST merge overlapping busy from multiple sets`      | MUST  | Union of busy.       |
| SF-04 | `findMutualFreeSlots() MUST respect minDurationMs`                          | MUST  | Short gaps excluded. |
| SF-05 | `findMutualFreeSlots() with fully busy window MUST return empty`            | MUST  | No free time.        |
| SF-06 | `findMutualFreeSlots() MUST handle adjacent (non-overlapping) busy periods` | MUST  | No gap between them. |

### `pipelines/pipeline.test.ts` — Visible Events Pipeline

| # | Test | Level | Description |
| --- | --- | --- | --- |
| PL-01 | `getVisibleEvents() MUST return events in window` | MUST | In-range events included. |
| PL-02 | `getVisibleEvents() MUST exclude events outside window` | MUST | Out-of-range excluded. |
| PL-03 | `getVisibleEvents() MUST filter by visible calendar IDs` | MUST | Hidden calendars excluded. |
| PL-04 | `getVisibleEvents() MUST expand recurring events` | MUST | RRULE → multiple occurrences. |
| PL-05 | `getVisibleEvents() MUST sort by startDate ascending` | MUST | Ordered output. |
| PL-06 | `getVisibleEvents() recurring instances MUST have isRecurrenceInstance=true` | MUST | Correct flag. |
| PL-07 | `getVisibleEvents() recurring instances MUST have parentUri` | MUST | Links to source. |

### `scheduling/transitions.test.ts` — State Machine

| #     | Test                                                               | Level | Description         |
| ----- | ------------------------------------------------------------------ | ----- | ------------------- |
| ST-01 | `pending + accept by attendee → accepted`                          | MUST  | Valid transition.   |
| ST-02 | `pending + decline by attendee → declined`                         | MUST  | Valid transition.   |
| ST-03 | `pending + tentative by attendee → tentative`                      | MUST  | Valid transition.   |
| ST-04 | `pending + cancel by organizer → cancelled`                        | MUST  | Valid transition.   |
| ST-05 | `accepted + cancel by organizer → cancelled`                       | MUST  | Valid transition.   |
| ST-06 | `accepted + decline by attendee → declined`                        | MUST  | Valid transition.   |
| ST-07 | `tentative + accept by attendee → accepted`                        | MUST  | Valid transition.   |
| ST-08 | `tentative + decline by attendee → declined`                       | MUST  | Valid transition.   |
| ST-09 | `tentative + cancel by organizer → cancelled`                      | MUST  | Valid transition.   |
| ST-10 | `cancelled + any action → MUST throw`                              | MUST  | Terminal state.     |
| ST-11 | `declined + any action → MUST throw`                               | MUST  | Terminal state.     |
| ST-12 | `attendee MUST NOT cancel`                                         | MUST  | Role enforcement.   |
| ST-13 | `organizer MUST NOT accept/decline/tentative`                      | MUST  | Role enforcement.   |
| ST-14 | `getAvailableActions() MUST return correct actions per state+role` | MUST  | Derived from table. |

### `scheduling/invite-flow.test.ts` — Invite Flow

| #     | Test                                                                  | Level | Description                |
| ----- | --------------------------------------------------------------------- | ----- | -------------------------- |
| IF-01 | `sendInvite() MUST create a MeetingRequest in the invite perspective` | MUST  | Request exists after send. |
| IF-02 | `sendInvite() MUST set status to pending`                             | MUST  | Initial state correct.     |
| IF-03 | `sendInvite() MUST set organizer to current DID`                      | MUST  | Identity set.              |
| IF-04 | `sendInvite() MUST include all attendee DIDs`                         | MUST  | All attendees listed.      |
| IF-05 | `respondToInvite() MUST update request status`                        | MUST  | pending → accepted.        |
| IF-06 | `respondToInvite() with unknown URI MUST throw`                       | MUST  | Clear error.               |

### `shared/governance.test.ts` — Governance Table

| #     | Test                                                      | Level | Description            |
| ----- | --------------------------------------------------------- | ----- | ---------------------- |
| GV-01 | `owner MUST be allowed all operations`                    | MUST  | Full access.           |
| GV-02 | `editor MUST be allowed create, edit, delete events`      | MUST  | Event ops only.        |
| GV-03 | `editor MUST NOT be allowed member management`            | MUST  | No invite/remove/role. |
| GV-04 | `viewer MUST NOT be allowed any write operations`         | MUST  | Read-only.             |
| GV-05 | `isAllowed() with unknown role MUST return false`         | MUST  | Safe default.          |
| GV-06 | `getAllowedOperations() MUST return correct set per role` | MUST  | Matches table.         |

### `shared/shared-calendar.test.ts` — Shared Calendar Operations

| # | Test | Level | Description |
| --- | --- | --- | --- |
| SC-01 | `createSharedCalendar() MUST register AgendaEvent model on new perspective` | MUST | Model available. |
| SC-02 | `createSharedCalendar() MUST create CalendarMeta in local perspective` | MUST | Sidebar knows about it. |
| SC-03 | `createSharedCalendar() MUST set role to owner` | MUST | Creator is owner. |
| SC-04 | `joinSharedCalendar() MUST register models on joined perspective` | MUST | Models available. |
| SC-05 | `joinSharedCalendar() MUST create CalendarMeta with role=viewer` | MUST | Default role. |
| SC-06 | `leaveSharedCalendar() MUST remove CalendarMeta` | MUST | Cleaned up. |

### `onboarding/import.test.ts` — ICS Import

| #     | Test                                                                  | Level | Description               |
| ----- | --------------------------------------------------------------------- | ----- | ------------------------- |
| OI-01 | `importIcsFile() MUST create AgendaEvent instances for valid VEVENTs` | MUST  | Events created.           |
| OI-02 | `importIcsFile() MUST apply defaults before create`                   | MUST  | Missing status → default. |
| OI-03 | `importIcsFile() MUST validate before create`                         | MUST  | Bad data → skipped.       |
| OI-04 | `importIcsFile() MUST report imported and skipped counts`             | MUST  | Accurate counts.          |
| OI-05 | `importIcsFile() MUST set calendarId on all imported events`          | MUST  | Correct calendar.         |
| OI-06 | `importIcsFile() MUST set organizer to provided DID`                  | MUST  | Identity set.             |
| OI-07 | `importIcsFile() with empty ICS MUST return imported=0`               | MUST  | No crash.                 |

### `onboarding/natural-language.test.ts` — Quick Add Parsing

| #     | Test                                                            | Level  | Description              |
| ----- | --------------------------------------------------------------- | ------ | ------------------------ |
| NL-01 | `"Coffee with Nico tomorrow at 10am" → name + startDate`        | MUST   | Name and time extracted. |
| NL-02 | `"Lunch at noon at Federation Square" → name + time + location` | MUST   | Location extracted.      |
| NL-03 | `"Meeting 2pm-3pm" → name + startDate + endDate`                | MUST   | Time range extracted.    |
| NL-04 | `Unrecognized input → name only`                                | MUST   | Graceful fallback.       |
| NL-05 | `parseQuickAdd() MUST be a pure function`                       | MUST   | No side effects.         |
| NL-06 | `Time parsing MUST handle 12-hour format (am/pm)`               | MUST   | 2pm = 14:00.             |
| NL-07 | `Time parsing MUST handle 24-hour format`                       | SHOULD | 14:00 = 14:00.           |

---

## Declarative Invariant Tests

| # | Test | Level | Description |
| --- | --- | --- | --- |
| DI-01 | `No module outside data/models/ may contain a predicate URI string literal` | MUST | Predicates come from model decorators only. |
| DI-02 | `No module outside data/annotations/ may contain hardcoded default values` | MUST | Defaults from annotations only. |
| DI-03 | `ModelForm.tsx MUST NOT import any specific model definition` | MUST | Reads from props (modelClass + annotations). |
| DI-04 | `Every ICS field mapping MUST be testable by adding one table entry` | MUST | No per-field functions. |
| DI-05 | `Transforms (ics.ts, rrule.ts, freebusy-gen.ts, slot-finder.ts) MUST NOT import @coasys/ad4m` | MUST | Pure functions, no AD4M dependency. |
| DI-06 | `Annotations (defaults.ts, validation-rules.ts, ics-mapping.ts) MUST NOT import @coasys/ad4m` | MUST | Pure functions operating on metadata. |
| DI-07 | `Pipeline modules MUST be the only data/ modules that import both models and transforms` | MUST | Clean layering. |
| DI-08 | `UI modules MUST access AD4M only through ad4m-context.ts` | MUST | Single point of access. |
| DI-09 | `governance-rules.ts MUST be a pure data table with no async operations` | MUST | Declarative, not imperative. |
| DI-10 | `request-transitions.ts MUST be a pure data table with no async operations` | MUST | Declarative state machine. |

---

## Implementation Order

1. **AD4M connection** — `ad4m-context.ts`, `bootstrap.ts`, ad4m-connect integration. Verify connection to executor.
2. **Layer 0: Models** — Ad4mModel classes with decorators, annotations, model registry. Registration tests green.
3. **Layer 0: Annotations** — defaults, validation, ICS mapping. Pure function tests green.
4. **Layer 0: Transforms** — ICS import/export, RRULE, free/busy gen, slot finder. Pure function tests green.
5. **Layer 0: Pipelines** — visible-events, availability. Pipeline tests green (mocked perspective).
6. **Layer 0: CRUD** — AgendaEvent/MeetingRequest/FreeBusy create/query/save/delete against mock perspective. CRUD tests green.
7. **Layer 1: UI** — Model-driven forms, calendar views, event state with subscriptions. Visual verification.
8. **Layer 2: Scheduling** — MeetingRequest state machine, invite flow via neighbourhoods. State machine tests green.
9. **Layer 3: Free/busy** — Availability pipeline + neighbourhood sharing. Integration tests green.
10. **Layer 4: Shared calendars** — Create/join/leave neighbourhoods, governance table. Governance tests green.
11. **Layer 5: Onboarding** — ICS import wizard, quick-add NL parsing. Import + NL tests green.

Each milestone is testable independently. Pure transforms and annotations can be tested with zero AD4M infrastructure. Model CRUD tests mock `PerspectiveProxy`. Integration tests require a running AD4M executor.
