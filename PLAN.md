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
7. **Backend-agnostic.** A `GraphAdapter` interface abstracts all graph operations. Two implementations: one for the Living Web browser API (`navigator.graph`), one for AD4M's GraphQL API directly. The rest of the app never knows which backend is running.

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `solid-js` | Reactive UI framework |
| `tailwindcss` | Styling |
| `ical.js` | ICS parsing/generation (VEVENT, RRULE, VALARM) |

No polyfill dependency at the package level. The Living Web adapter uses the global `navigator.graph` API (installed by any polyfill or native browser). The AD4M adapter uses `fetch` against the executor's GraphQL endpoint directly.

---

## Package Structure

```
packages/client/
├── src/
│   ├── index.tsx                          # App mount
│   ├── index.css                          # Tailwind + base styles
│   ├── App.tsx                            # Root: detect backend, bootstrap, provide context
│   │
│   ├── adapter/                           # Backend abstraction layer
│   │   ├── types.ts                       # GraphAdapter interface + supporting types
│   │   ├── living-web.ts                  # LivingWebAdapter: implements GraphAdapter via navigator.graph
│   │   ├── ad4m.ts                        # AD4MAdapter: implements GraphAdapter via GraphQL to executor
│   │   ├── detect.ts                      # Auto-detect available backend, instantiate adapter
│   │   └── mock.ts                        # MockAdapter: in-memory, for tests
│   │
│   ├── data/                              # Layer 0 — Declarative Data Foundation
│   │   ├── shapes/                        # Shape definitions (the single source of truth)
│   │   │   ├── event.ts                   # EVENT_SHAPE definition + annotations
│   │   │   ├── meeting-request.ts         # MEETING_REQUEST_SHAPE definition + annotations
│   │   │   ├── freebusy.ts               # FREE_BUSY_SHAPE definition + annotations
│   │   │   ├── calendar-meta.ts           # CALENDAR_META_SHAPE definition + annotations
│   │   │   └── index.ts                   # Shape registry (all shapes, lookup by name)
│   │   │
│   │   ├── engine/                        # Generic, shape-agnostic operations (uses GraphAdapter)
│   │   │   ├── graph-context.ts           # Bootstrap: create graph via adapter, register shapes, provide context
│   │   │   ├── instance-ops.ts            # Generic CRUD: create/get/update/delete via adapter
│   │   │   ├── query-builder.ts           # Build queries from shape metadata + filter params
│   │   │   └── subscriptions.ts           # Event listeners via adapter.subscribe()
│   │   │
│   │   ├── derivations/                   # Shape-derived utilities (all take shape as input)
│   │   │   ├── types.ts                   # ShapeAnnotations, FieldAnnotation, ValidationRule types
│   │   │   ├── defaults.ts                # Apply defaults from annotations before create
│   │   │   ├── validation-rules.ts        # Validate data against shape + annotation rules
│   │   │   └── ics-mapping.ts             # ICS ↔ shape field mapping (driven by annotation table)
│   │   │
│   │   ├── transforms/                    # Pure data transformations (no adapter access)
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
│   │   │   └── field-registry.ts          # Maps inputType → component (declarative)
│   │   ├── components/
│   │   │   ├── TimeGrid.tsx               # Shared hour-slot grid
│   │   │   ├── DatePicker.tsx             # Mini calendar
│   │   │   ├── TimePicker.tsx             # Time input
│   │   │   └── CalendarChip.tsx           # Colored label
│   │   └── state/
│   │       ├── view-state.ts              # Current view, date, range (SolidJS store)
│   │       ├── calendar-state.ts          # Visible calendars, calendar metadata (SolidJS store)
│   │       └── event-state.ts             # Reactive query results (derived from view-state + adapter)
│   │
│   ├── scheduling/                        # Layer 2 — Person-to-Person Scheduling
│   │   ├── invite-flow.ts                 # event+attendee → shared graph → MeetingRequest
│   │   ├── request-transitions.ts         # Declarative state machine
│   │   ├── InvitePanel.tsx                # Incoming/outgoing request list
│   │   └── ContactPicker.tsx              # DID search
│   │
│   ├── shared/                            # Layer 4 — Shared Calendars
│   │   ├── shared-calendar-ops.ts         # Create/join/leave via adapter.share()/join()
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

## The Adapter Layer

### `adapter/types.ts` — The Contract

This is the interface the entire app codes against. Both backends implement it fully.

```typescript
/**
 * GraphAdapter — the single abstraction between Agenda and the graph backend.
 *
 * Implements: graph lifecycle, shape registration, instance CRUD,
 * property operations, queries, subscriptions, identity, and sharing.
 *
 * Two implementations:
 *   LivingWebAdapter — talks to navigator.graph (polyfill or native browser)
 *   AD4MAdapter      — talks to AD4M executor via GraphQL over HTTP/WS
 *
 * The rest of Agenda never imports from either implementation directly.
 */

// ── Graph Lifecycle ──

export interface GraphAdapter {
  /**
   * Create a new personal graph.
   * Living Web: navigator.graph.create(name)
   * AD4M: mutation { perspectiveAdd(name) { uuid name } }
   */
  createGraph(name?: string): Promise<GraphHandle>

  /**
   * List all personal graphs.
   * Living Web: navigator.graph.list()
   * AD4M: query { perspectives { uuid name sharedUrl } } (filter sharedUrl === null)
   */
  listGraphs(): Promise<GraphHandle[]>

  /**
   * Get a graph by ID.
   * Living Web: navigator.graph.get(id)
   * AD4M: query { perspective(uuid) { uuid name } }
   */
  getGraph(id: string): Promise<GraphHandle | null>

  /**
   * Remove a graph permanently.
   * Living Web: navigator.graph.remove(id)
   * AD4M: mutation { perspectiveRemove(uuid) }
   */
  removeGraph(id: string): Promise<boolean>

  // ── Shape Registration ──

  /**
   * Register a shape definition on a graph.
   * Living Web: graph.addShape(name, json)
   * AD4M: mutation { perspectiveAddSdna(uuid, name, sdnaCode, sdnaType: "subject_class") }
   */
  registerShape(graphId: string, name: string, shape: ShapeDefinition): Promise<void>

  /**
   * List registered shape names on a graph.
   * Living Web: graph.getShapes()
   * AD4M: query shacl://has_shape links
   */
  listShapes(graphId: string): Promise<string[]>

  // ── Instance CRUD ──

  /**
   * Create a shape instance.
   * Living Web: graph.createShapeInstance(shapeName, uri, data)
   * AD4M: mutation { perspectiveCreateSubject(uuid, subjectClass, exprAddr, initialValues) }
   */
  createInstance(
    graphId: string,
    shapeName: string,
    uri: string,
    data: Record<string, unknown>,
  ): Promise<string>

  /**
   * Get instance data.
   * Living Web: graph.getShapeInstanceData(shapeName, uri)
   * AD4M: mutation { perspectiveGetSubjectData(uuid, subjectClass, exprAddr) }
   */
  getInstance(
    graphId: string,
    shapeName: string,
    uri: string,
  ): Promise<Record<string, unknown> | null>

  /**
   * List all instance URIs for a shape.
   * Living Web: graph.getShapeInstances(shapeName)
   * AD4M: query links with predicate rdf://type matching shape's targetClass
   */
  listInstances(graphId: string, shapeName: string): Promise<string[]>

  /**
   * Set a scalar property on an instance.
   * Living Web: graph.setShapeProperty(shapeName, uri, property, value)
   * AD4M: remove old link + add new link for the predicate
   */
  setProperty(
    graphId: string,
    shapeName: string,
    uri: string,
    property: string,
    value: unknown,
  ): Promise<void>

  /**
   * Add a value to a collection property.
   * Living Web: graph.addToShapeCollection(shapeName, uri, collection, value)
   * AD4M: perspectiveAddLink with the collection predicate
   */
  addToCollection(
    graphId: string,
    shapeName: string,
    uri: string,
    collection: string,
    value: string,
  ): Promise<void>

  /**
   * Remove a value from a collection property.
   * Living Web: graph.removeFromShapeCollection(shapeName, uri, collection, value)
   * AD4M: find and remove the specific link
   */
  removeFromCollection(
    graphId: string,
    shapeName: string,
    uri: string,
    collection: string,
    value: string,
  ): Promise<void>

  /**
   * Delete an instance (remove all its triples).
   * Living Web: remove all triples where source = uri
   * AD4M: query all links with source = uri, remove each
   */
  deleteInstance(graphId: string, uri: string): Promise<boolean>

  // ── Queries ──

  /**
   * Query triples with filters.
   * Living Web: graph.queryTriples(query)
   * AD4M: query { perspectiveQueryLinks(uuid, query) }
   */
  queryTriples(graphId: string, query: TripleQuery): Promise<SignedTriple[]>

  /**
   * Execute a SPARQL query.
   * Living Web: graph.querySparql(sparql)
   * AD4M: query { perspectiveSparqlQuery(uuid, query) }
   */
  querySparql(graphId: string, sparql: string): Promise<SparqlResult>

  // ── Subscriptions ──

  /**
   * Subscribe to triple changes on a graph.
   * Living Web: graph.addEventListener('tripleadded'/'tripleremoved', cb)
   * AD4M: subscription { perspectiveLinkAdded/perspectiveLinkRemoved(uuid) }
   */
  subscribe(
    graphId: string,
    event: 'tripleadded' | 'tripleremoved',
    callback: (triple: SignedTriple) => void,
  ): Unsubscribe

  // ── Identity ──

  /**
   * Get the current user's DID.
   * Living Web: navigator.credentials.get({ type: 'did' })
   * AD4M: query { agent { did } }
   */
  getIdentity(): Promise<{ did: string } | null>

  // ── Sharing (for Layers 2–4) ──

  /**
   * Share a graph as a peer-to-peer shared graph.
   * Living Web: graph.share(opts)
   * AD4M: mutation { neighbourhoodPublishFromPerspective(uuid, linkLanguage, meta) }
   */
  shareGraph(graphId: string, opts?: ShareOptions): Promise<SharedGraphHandle>

  /**
   * Join an existing shared graph by URL.
   * Living Web: navigator.graph.join(url)
   * AD4M: mutation { neighbourhoodJoinFromUrl(url) }
   */
  joinGraph(url: string): Promise<SharedGraphHandle>

  /**
   * Get online peers for a shared graph.
   * Living Web: shared.peers()
   * AD4M: query { neighbourhoodOnlineAgents(perspectiveUUID) }
   */
  getPeers(graphId: string): Promise<string[]>
}

// ── Supporting Types ──

export interface GraphHandle {
  id: string             // UUID
  name: string | null
}

export interface SharedGraphHandle extends GraphHandle {
  url: string            // share URL / neighbourhood URL
}

export interface ShareOptions {
  name?: string
  module?: string        // sync module / link language hash
}

export type Unsubscribe = () => void

/** Reused from Living Web spec — backend-agnostic */
export interface SemanticTriple {
  source: string
  target: string
  predicate: string | null
}

export interface SignedTriple {
  data: SemanticTriple
  author: string
  timestamp: string
  proof: { key: string; signature: string }
}

export interface TripleQuery {
  source?: string | null
  predicate?: string | null
  target?: string | null
  fromDate?: string | null
  untilDate?: string | null
  limit?: number | null
}

export interface SparqlResult {
  type: 'bindings' | 'graph'
  bindings: Record<string, string>[]
  triples?: SemanticTriple[]
}

export interface ShapeDefinition {
  targetClass: string
  properties: ShapeProperty[]
  constructor: ShapeConstructorAction[]
}

export interface ShapeProperty {
  path: string
  name: string
  datatype?: string
  minCount?: number
  maxCount?: number
}

export interface ShapeConstructorAction {
  action: string
  source: string
  predicate: string
  target: string
}
```

### `adapter/detect.ts` — Backend Detection

```typescript
/**
 * Auto-detect which backend is available. Priority:
 *
 * 1. AD4M executor (if reachable at configured URL) — richer feature set,
 *    native SPARQL, Holochain P2P, persistent identity.
 * 2. Living Web API (if navigator.graph exists) — browser-native or polyfill.
 * 3. Fallback: throw with a clear error message.
 *
 * Can also be forced via config:
 *   { backend: 'ad4m', executorUrl: '...' }
 *   { backend: 'living-web' }
 */

export interface AdapterConfig {
  backend?: 'ad4m' | 'living-web' | 'auto'
  /** AD4M executor GraphQL endpoint (default: http://localhost:12000/graphql) */
  executorUrl?: string
  /** AD4M auth token */
  authToken?: string
  /** AD4M agent passphrase for auto-unlock */
  passphrase?: string
}

export async function createAdapter(config?: AdapterConfig): Promise<GraphAdapter>
```

### `adapter/living-web.ts` — Living Web Implementation

```typescript
/**
 * Implements GraphAdapter by delegating to navigator.graph (the Living Web browser API).
 *
 * Works with:
 *   - Native browser support (Chromium fork)
 *   - Standalone polyfills (@living-web/personal-graph etc.)
 *   - AD4M polyfill (@living-web/ad4m-polyfill) — but if you have the polyfill,
 *     you might prefer the AD4M adapter directly for richer features.
 *   - Chrome extension that injects the polyfills
 *
 * The adapter holds no state beyond references to PersonalGraph objects.
 * All persistence is handled by the browser API / polyfill.
 */
export class LivingWebAdapter implements GraphAdapter {
  private graphs: Map<string, PersonalGraph> = new Map()

  async createGraph(name?: string): Promise<GraphHandle> {
    const graph = await navigator.graph!.create(name)
    this.graphs.set(graph.uuid, graph)
    return { id: graph.uuid, name: graph.name }
  }

  async registerShape(graphId: string, name: string, shape: ShapeDefinition): Promise<void> {
    const graph = await this.resolve(graphId)
    await graph.addShape(name, JSON.stringify(shape))
  }

  async createInstance(graphId: string, shapeName: string, uri: string, data: Record<string, unknown>): Promise<string> {
    const graph = await this.resolve(graphId)
    return graph.createShapeInstance(shapeName, uri, data)
  }

  async getInstance(graphId: string, shapeName: string, uri: string): Promise<Record<string, unknown> | null> {
    const graph = await this.resolve(graphId)
    return graph.getShapeInstanceData(shapeName, uri)
  }

  // ... etc — each method delegates to the corresponding navigator.graph call

  private async resolve(graphId: string): Promise<PersonalGraph> {
    if (this.graphs.has(graphId)) return this.graphs.get(graphId)!
    const graph = await navigator.graph!.get(graphId)
    if (!graph) throw new Error(`Graph ${graphId} not found`)
    this.graphs.set(graphId, graph)
    return graph
  }
}
```

### `adapter/ad4m.ts` — AD4M Direct Implementation

```typescript
/**
 * Implements GraphAdapter by talking directly to the AD4M executor
 * via GraphQL over HTTP (queries/mutations) and WebSocket (subscriptions).
 *
 * Advantages over going through the Living Web polyfill:
 *   - Native SPARQL via Oxigraph (full query power, not the polyfill's basic subset)
 *   - Direct subject class operations (perspectiveCreateSubject, perspectiveGetSubjectData)
 *   - WebSocket subscriptions for real-time (perspectiveLinkAdded/Removed)
 *   - Agent identity managed by executor (persistent across sessions)
 *   - Holochain-based P2P sync (no WebRTC fallback needed)
 *   - No polyfill overhead — one fewer abstraction layer
 *
 * Requires a running AD4M executor (typically localhost:12000).
 */
export class AD4MAdapter implements GraphAdapter {
  private url: string
  private wsUrl: string
  private headers: Record<string, string>

  constructor(config: { executorUrl: string; wsUrl?: string; authToken?: string }) {
    this.url = config.executorUrl
    this.wsUrl = config.wsUrl ?? config.executorUrl.replace('http', 'ws')
    this.headers = { 'Content-Type': 'application/json' }
    if (config.authToken) this.headers['Authorization'] = `Bearer ${config.authToken}`
  }

  async createGraph(name?: string): Promise<GraphHandle> {
    const data = await this.gql<{ perspectiveAdd: { uuid: string; name: string } }>(
      `mutation($name: String!) { perspectiveAdd(name: $name) { uuid name } }`,
      { name: name ?? '' },
    )
    return { id: data.perspectiveAdd.uuid, name: data.perspectiveAdd.name }
  }

  async registerShape(graphId: string, name: string, shape: ShapeDefinition): Promise<void> {
    await this.gql(
      `mutation($uuid: String!, $name: String!, $sdna: String!) {
        perspectiveAddSdna(uuid: $uuid, name: $name, sdnaCode: $sdna, sdnaType: "subject_class")
      }`,
      { uuid: graphId, name, sdna: JSON.stringify(shape) },
    )
  }

  async createInstance(graphId: string, shapeName: string, uri: string, data: Record<string, unknown>): Promise<string> {
    const result = await this.gql<{ perspectiveCreateSubject: string }>(
      `mutation($uuid: String!, $class: String!, $addr: String!, $vals: JSON) {
        perspectiveCreateSubject(uuid: $uuid, subjectClass: $class, exprAddr: $addr, initialValues: $vals)
      }`,
      { uuid: graphId, class: shapeName, addr: uri, vals: data },
    )
    return result.perspectiveCreateSubject
  }

  async querySparql(graphId: string, sparql: string): Promise<SparqlResult> {
    // AD4M has native Oxigraph SPARQL — use it directly
    const data = await this.gql<{ perspectiveSparqlQuery: string }>(
      `query($uuid: String!, $query: String!) {
        perspectiveSparqlQuery(uuid: $uuid, query: $query)
      }`,
      { uuid: graphId, query: sparql },
    )
    // Parse Oxigraph's response format
    const parsed = JSON.parse(data.perspectiveSparqlQuery)
    // ... normalize to SparqlResult
  }

  subscribe(graphId: string, event: 'tripleadded' | 'tripleremoved', callback: (t: SignedTriple) => void): Unsubscribe {
    // WebSocket subscription to perspectiveLinkAdded / perspectiveLinkRemoved
    // ...
  }

  async getIdentity(): Promise<{ did: string } | null> {
    const data = await this.gql<{ agent: { did: string | null } }>(
      `query { agent { did isUnlocked } }`,
    )
    return data.agent.did ? { did: data.agent.did } : null
  }

  async shareGraph(graphId: string, opts?: ShareOptions): Promise<SharedGraphHandle> {
    const meta = opts?.name ? [{ data: { source: 'self', predicate: 'name', target: opts.name }, author: '', timestamp: '', proof: { key: '', signature: '', valid: true } }] : []
    const data = await this.gql<{ neighbourhoodPublishFromPerspective: string }>(
      `mutation($uuid: String!, $ll: String!, $meta: PerspectiveInput!) {
        neighbourhoodPublishFromPerspective(perspectiveUUID: $uuid, linkLanguage: $ll, meta: $meta)
      }`,
      { uuid: graphId, ll: opts?.module ?? '', meta: { links: meta } },
    )
    return { id: graphId, name: opts?.name ?? null, url: data.neighbourhoodPublishFromPerspective }
  }

  // ... etc

  private async gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ query, variables }),
    })
    const json = await res.json() as { data?: T; errors?: Array<{ message: string }> }
    if (json.errors?.length) throw new Error(json.errors[0].message)
    return json.data as T
  }
}
```

### `adapter/mock.ts` — Test Backend

```typescript
/**
 * In-memory GraphAdapter for unit and E2E tests.
 * No network, no executor, no polyfill — pure JS.
 *
 * Shape-aware: validates against registered shape definitions.
 * Fires subscription callbacks synchronously for deterministic tests.
 */
export class MockAdapter implements GraphAdapter {
  private graphs: Map<string, MockGraph> = new Map()

  // ... full in-memory implementation of every GraphAdapter method
}

interface MockGraph {
  id: string
  name: string | null
  shapes: Map<string, ShapeDefinition>
  instances: Map<string, { shapeName: string; data: Record<string, unknown> }>
  listeners: Map<string, Set<(triple: SignedTriple) => void>>
}
```

---

## How the Adapter Connects to the Engine

The engine layer (`instance-ops.ts`, `query-builder.ts`, `subscriptions.ts`) receives a `GraphAdapter` via SolidJS context. It never knows or cares which backend is running.

```
┌─────────────────────────────────────────────┐
│                     UI                       │
│   ShapeForm, WeekView, EventBlock, etc.     │
└──────────────────┬──────────────────────────┘
                   │ uses
┌──────────────────┴──────────────────────────┐
│              Engine (InstanceOps)             │
│   create / get / update / delete / query     │
│   + validation + defaults + pipelines        │
└──────────────────┬──────────────────────────┘
                   │ calls
┌──────────────────┴──────────────────────────┐
│           GraphAdapter interface             │
│   createGraph, registerShape,                │
│   createInstance, getInstance, setProperty,  │
│   queryTriples, querySparql, subscribe,      │
│   getIdentity, shareGraph, joinGraph         │
└──────┬──────────────┬──────────────┬────────┘
       │              │              │
┌──────┴─────┐ ┌──────┴─────┐ ┌─────┴──────┐
│ LivingWeb  │ │   AD4M     │ │   Mock     │
│ Adapter    │ │  Adapter   │ │  Adapter   │
│            │ │            │ │            │
│ navigator  │ │  GraphQL   │ │ In-memory  │
│  .graph    │ │  HTTP/WS   │ │   Maps     │
└────────────┘ └────────────┘ └────────────┘
```

**Bootstrap flow (App.tsx):**

```typescript
const adapter = await createAdapter({ backend: 'auto' })
// 1. 'auto' tries AD4M executor at localhost:12000 first
// 2. Falls back to navigator.graph if executor unreachable
// 3. Throws if neither available

const engine = new InstanceOpsImpl(adapter, SHAPE_REGISTRY)
await engine.bootstrap('My Calendar')  // creates/finds graph, registers all shapes

// Provide via SolidJS context
<AdapterContext.Provider value={adapter}>
  <EngineContext.Provider value={engine}>
    <Shell />
  </EngineContext.Provider>
</AdapterContext.Provider>
```

---

## Adapter Tests

The adapter interface has its own conformance test suite. Each test runs against **all three implementations** (Living Web, AD4M, Mock) via a parameterized test factory.

```
adapter/__tests__/
├── adapter-conformance.test.ts    # parameterized: runs against all adapters
├── living-web.test.ts             # Living Web-specific edge cases
├── ad4m.test.ts                   # AD4M-specific edge cases
└── detect.test.ts                 # Backend detection logic
```

### `adapter-conformance.test.ts` — Adapter Contract Tests

These tests define the contract. Every adapter MUST pass all of them.

| # | Test | Level | Description |
|---|------|-------|-------------|
| A-01 | `createGraph() MUST return a GraphHandle with a unique id` | MUST | Two calls MUST return different ids. |
| A-02 | `createGraph(name) MUST store the name` | MUST | `getGraph(id).name` MUST equal the provided name. |
| A-03 | `listGraphs() MUST return all created graphs` | MUST | After creating 3 graphs, list MUST return all 3. |
| A-04 | `getGraph() MUST return null for unknown id` | MUST | Non-existent UUID → null. |
| A-05 | `removeGraph() MUST delete the graph` | MUST | After remove, `getGraph()` MUST return null. |
| A-06 | `removeGraph() MUST return true for existing, false for non-existent` | MUST | Matches expected semantics. |
| A-07 | `registerShape() MUST make the shape queryable via listShapes()` | MUST | After registering "Event", `listShapes()` MUST include "Event". |
| A-08 | `registerShape() with duplicate name MUST throw or be idempotent` | MUST | Adapter MUST either reject the duplicate or silently accept it. |
| A-09 | `createInstance() MUST persist instance data` | MUST | After create, `getInstance()` MUST return the data. |
| A-10 | `createInstance() MUST return the URI` | MUST | Returned URI MUST match the provided URI. |
| A-11 | `getInstance() MUST return null for unknown URI` | MUST | Non-existent instance → null. |
| A-12 | `listInstances() MUST return all created instance URIs for a shape` | MUST | After creating 3 Events, list MUST return 3 URIs. |
| A-13 | `setProperty() MUST update the value` | MUST | After set, `getInstance()` MUST reflect the new value. |
| A-14 | `setProperty() MUST NOT affect other properties` | MUST | Updating `name` MUST NOT change `startDate`. |
| A-15 | `addToCollection() MUST append to the collection` | MUST | After add, collection MUST include the new value. |
| A-16 | `addToCollection() MUST allow multiple values` | MUST | Adding 3 attendees → collection has 3 entries. |
| A-17 | `removeFromCollection() MUST remove the specific value` | MUST | After remove, collection MUST NOT include the value. |
| A-18 | `deleteInstance() MUST remove the instance` | MUST | After delete, `getInstance()` MUST return null. |
| A-19 | `deleteInstance() MUST return true for existing, false for non-existent` | MUST | Standard semantics. |
| A-20 | `queryTriples() MUST return matching triples` | MUST | Query by predicate MUST return only triples with that predicate. |
| A-21 | `subscribe('tripleadded') MUST fire when a triple is added` | MUST | Creating an instance MUST trigger the callback. |
| A-22 | `subscribe() MUST return an unsubscribe function that stops callbacks` | MUST | After unsubscribe, no more callbacks. |
| A-23 | `getIdentity() MUST return a DID or null` | MUST | Not undefined, not throw. |

### `detect.test.ts` — Backend Detection

| # | Test | Level | Description |
|---|------|-------|-------------|
| D-01 | `backend: 'ad4m' MUST use AD4MAdapter` | MUST | Explicit selection. |
| D-02 | `backend: 'living-web' MUST use LivingWebAdapter` | MUST | Explicit selection. |
| D-03 | `backend: 'auto' with reachable executor MUST prefer AD4MAdapter` | MUST | AD4M takes priority. |
| D-04 | `backend: 'auto' with unreachable executor but navigator.graph MUST fall back to LivingWebAdapter` | MUST | Graceful fallback. |
| D-05 | `backend: 'auto' with neither available MUST throw` | MUST | Clear error, not silent failure. |

---

## Layer 0: Declarative Data Foundation

(Shapes, annotations, engine, transforms, pipelines — unchanged from previous plan revision. The engine now calls `GraphAdapter` methods instead of `navigator.graph` directly.)

### Shape Definitions (the source of truth)

Each shape is a JSON definition with **annotations** — metadata that drives UI rendering, ICS mapping, validation, and default values. Annotations are Agenda-level, not part of the Living Web spec.

#### `data/shapes/event.ts`

```typescript
import type { ShapeDefinition } from '../../adapter/types'
import type { ShapeAnnotations } from '../derivations/types'

/** The shape — pure spec-level definition */
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
  defaults: {
    status: 'EventScheduled',
    visibility: 'private',
  },
  rules: [
    { type: 'comparison', field: 'endDate', operator: '>', referenceField: 'startDate',
      message: 'End date must be after start date' },
  ],
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
  | 'text' | 'textarea' | 'url'
  | 'datetime' | 'date' | 'time'
  | 'duration' | 'select' | 'rrule'
  | 'did-list' | 'calendar-select' | 'hidden'

export interface ValidationRule {
  type: 'comparison' | 'pattern' | 'custom'
  field: string
  operator?: '>' | '<' | '>=' | '<=' | '==' | '!='
  referenceField?: string
  pattern?: string
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

export const SHAPE_REGISTRY: Record<string, RegisteredShape> = {
  Event:          { shape: EVENT_SHAPE,            annotations: EVENT_ANNOTATIONS },
  MeetingRequest: { shape: MEETING_REQUEST_SHAPE,  annotations: MEETING_REQUEST_ANNOTATIONS },
  FreeBusy:       { shape: FREE_BUSY_SHAPE,        annotations: FREE_BUSY_ANNOTATIONS },
  CalendarMeta:   { shape: CALENDAR_META_SHAPE,    annotations: CALENDAR_META_ANNOTATIONS },
}
```

### Generic Engine (uses GraphAdapter)

#### `data/engine/instance-ops.ts`

```typescript
/**
 * Generic, shape-driven CRUD. Operates on any shape via the GraphAdapter.
 * No shape-specific code. No backend-specific code.
 */
export interface InstanceOps {
  /** Bootstrap: create/find graph, register all shapes from registry */
  bootstrap(graphName: string): Promise<string>  // returns graphId

  create(shapeName: string, data: Record<string, unknown>): Promise<Record<string, unknown>>
  get(shapeName: string, uri: string): Promise<Record<string, unknown> | null>
  update(shapeName: string, uri: string, patch: Record<string, unknown>): Promise<Record<string, unknown>>
  delete(shapeName: string, uri: string): Promise<boolean>
  query(shapeName: string, filters: QueryFilters): Promise<Record<string, unknown>[]>
}
```

---

## Layer 0 Tests

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
| SC-01 | `Every shape in SHAPE_REGISTRY MUST have a targetClass` | MUST | Non-empty targetClass on all shapes. |
| SC-02 | `Every shape property MUST have a valid predicate URI (schema:// or agenda://)` | MUST | No typos in paths. |
| SC-03 | `Every shape property MUST have a name matching [a-zA-Z_][a-zA-Z0-9_]*` | MUST | Per spec. |
| SC-04 | `Shape property names MUST be unique within each shape` | MUST | No duplicates. |
| SC-05 | `Constructor actions MUST reference only declared property names as targets` | MUST | No orphan references. |
| SC-06 | `Every shape MUST have annotations in the registry` | MUST | Both shape and annotations present. |
| SC-07 | `Every shape property MUST have a corresponding field annotation` | MUST | Annotations cover all properties. |
| SC-08 | `Annotation defaults MUST only reference declared property names` | MUST | No phantom defaults. |
| SC-09 | `Annotation validation rules MUST only reference declared property names` | MUST | Both field and referenceField exist. |
| SC-10 | `ICS mapping keys MUST only reference declared property names` | MUST | No orphan mappings. |

### `instance-ops.test.ts` — Generic CRUD (runs against MockAdapter)

| # | Test | Level | Description |
|---|------|-------|-------------|
| IO-01 | `create() MUST generate a unique URI for every instance` | MUST | Two identical creates → different URIs. |
| IO-02 | `create() MUST apply declarative defaults from annotations` | MUST | Event without status → `EventScheduled`. |
| IO-03 | `create() MUST reject if a required property (minCount ≥ 1) is missing` | MUST | Omitting `name` → error. |
| IO-04 | `create() MUST run validation rules before persisting` | MUST | endDate < startDate → rejected. |
| IO-05 | `create() MUST call adapter.createInstance() with correct args` | MUST | Mock receives shape name, URI, merged data. |
| IO-06 | `get() MUST return instance data for a valid URI` | MUST | Round-trip: create → get → match. |
| IO-07 | `get() MUST return null for unknown URI` | MUST | Non-existent → null. |
| IO-08 | `update() MUST modify only specified fields` | MUST | Update `name` → `startDate` unchanged. |
| IO-09 | `update() MUST re-validate after patch` | MUST | endDate < startDate after patch → rejected. |
| IO-10 | `update() MUST call correct adapter operations per property cardinality` | MUST | Scalar → setProperty. Collection → addToCollection/removeFromCollection. |
| IO-11 | `delete() MUST remove instance` | MUST | After delete, get → null. |
| IO-12 | `delete() MUST return true/false correctly` | MUST | Exists → true, not exists → false. |
| IO-13 | `query() with dateRange MUST return overlapping instances` | MUST | Standard range overlap semantics. |
| IO-14 | `query() with dateRange MUST NOT return outside instances` | MUST | Before/after range → excluded. |
| IO-15 | `query() with where MUST filter by property value` | MUST | `calendarId: 'work'` → only work events. |
| IO-16 | `create() MUST work for any shape in registry` | MUST | MeetingRequest and FreeBusy follow same path. |
| IO-17 | `InstanceOps MUST NOT contain shape-specific methods` | MUST | Generic only. |

### `validation.test.ts` — Declarative Validation

| # | Test | Level | Description |
|---|------|-------|-------------|
| VL-01 | `validate() MUST check minCount for required properties` | MUST | Missing `name` → error. |
| VL-02 | `validate() MUST check datatype constraints` | MUST | Non-datetime for `startDate` → error. |
| VL-03 | `validate() MUST evaluate comparison rules` | MUST | endDate ≤ startDate → error. |
| VL-04 | `validate() MUST return empty array when valid` | MUST | Good data → `[]`. |
| VL-05 | `validate() MUST work for any shape` | MUST | Not Event-specific. |
| VL-06 | `Adding a rule to annotations MUST be enforced without code changes` | MUST | Declarative extensibility. |

### `ics.test.ts` — Declarative ICS Mapping

| # | Test | Level | Description |
|---|------|-------|-------------|
| I-01 | `importVEvent() MUST map via icsMapping table` | MUST | Table-driven, not per-field. |
| I-02 | `importVEvent() MUST convert ICS datetime to ISO 8601` | MUST | Format conversion. |
| I-03 | `importVEvent() MUST ignore unmapped ICS fields` | MUST | Silent drop. |
| I-04 | `importVEvent() MUST handle multiple VEVENTs` | MUST | N inputs → N outputs. |
| I-05 | `exportVEvent() MUST map via icsMapping table` | MUST | Reverse direction. |
| I-06 | `exportVEvent() MUST produce valid iCalendar` | MUST | Correct wrapper. |
| I-07 | `exportVEvent() MUST generate UID if absent` | MUST | Every VEVENT needs UID. |
| I-08 | `Round-trip MUST preserve core fields` | MUST | Import → export → import = equivalent. |
| I-09 | `Adding a mapping entry MUST be sufficient (no code change)` | MUST | Key declarative test. |

### `rrule.test.ts` — Recurrence Expansion

| # | Test | Level | Description |
|---|------|-------|-------------|
| R-01 | `parseRRule() MUST parse FREQ=DAILY` | MUST | |
| R-02 | `parseRRule() MUST parse FREQ=WEEKLY with BYDAY` | MUST | |
| R-03 | `parseRRule() MUST parse FREQ=MONTHLY` | MUST | |
| R-04 | `parseRRule() MUST parse FREQ=YEARLY` | MUST | |
| R-05 | `parseRRule() MUST parse INTERVAL` | MUST | |
| R-06 | `parseRRule() MUST parse COUNT` | MUST | |
| R-07 | `parseRRule() MUST parse UNTIL` | MUST | |
| R-08 | `expandOccurrences() daily: 7-day window → 7 occurrences` | MUST | |
| R-09 | `expandOccurrences() weekly BYDAY=MO,WE: 2 weeks → 4 occurrences` | MUST | |
| R-10 | `expandOccurrences() MUST respect COUNT` | MUST | |
| R-11 | `expandOccurrences() MUST respect UNTIL` | MUST | |
| R-12 | `expandOccurrences() MUST NOT generate outside window` | MUST | |
| R-13 | `expandOccurrences() MUST handle timezone offsets` | MUST | |
| R-14 | `expandOccurrences() SHOULD handle EXDATE` | SHOULD | |
| R-15 | `expandOccurrences() MUST set parentUri` | MUST | |

### `freebusy.test.ts` / `slot-finder.test.ts` / `pipeline.test.ts`

(Unchanged from previous revision — pure functions, no adapter dependency.)

---

## Layer 1–5 Tests

(Unchanged from previous revision — UI, scheduling state machine, governance table, NL patterns.)

---

## Declarative Invariant Tests

| # | Test | Level | Description |
|---|------|-------|-------------|
| DI-01 | `No module outside data/shapes/ may contain a predicate URI string literal` | MUST | Predicates come from shapes only. |
| DI-02 | `No module outside data/derivations/ may contain hardcoded default values` | MUST | Defaults from annotations only. |
| DI-03 | `instance-ops.ts MUST NOT import any specific shape definition` | MUST | Reads from registry. |
| DI-04 | `ShapeForm.tsx MUST NOT import any specific shape definition` | MUST | Reads from context. |
| DI-05 | `Every ICS field mapping MUST be testable by adding one table entry` | MUST | No per-field functions. |
| DI-06 | `No module outside adapter/ may import LivingWebAdapter or AD4MAdapter directly` | MUST | Everything goes through the GraphAdapter interface. |
| DI-07 | `Engine and UI layers MUST only depend on adapter/types.ts, never on adapter implementations` | MUST | Import boundary enforcement. |

---

## Implementation Order

1. **Adapter layer** — `GraphAdapter` interface + `MockAdapter`. Conformance tests green.
2. **Layer 0** — Shapes, annotations, engine (using MockAdapter), transforms, pipelines. Unit tests green.
3. **`LivingWebAdapter`** — implement + pass conformance tests.
4. **`AD4MAdapter`** — implement + pass conformance tests.
5. **`detect.ts`** — auto-detection logic + tests.
6. **Layer 1** — Shape-driven UI. E2E tests green (against MockAdapter).
7. **Layer 2** — Meeting request state machine. Unit tests green.
8. **Layer 3** — Free/busy overlay UI (transforms already in Layer 0).
9. **Layer 4** — Shared calendars + governance table. Unit tests green.
10. **Layer 5** — NL patterns, import wizard. Unit tests green.

Each milestone is testable independently. The adapter conformance suite runs against all three backends as they're implemented.
