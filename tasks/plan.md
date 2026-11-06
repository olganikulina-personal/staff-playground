# Implementation Plan: Staff Engineering Architecture Playground

## Overview

Create a local Vite + React + TypeScript playground whose first complete vertical slice is the Database Architecture Lab. The implementation starts with deterministic, framework-independent simulation contracts, then wires one database scenario through shared controls, a React Flow diagram, a timeline, explanations, decision questions, and comparison/reset interactions.

## Architecture Decisions

- Use `@xyflow/react` for the diagram surface. The diagram receives derived nodes and edges from simulation results and does not contain domain rules.
- Use a pure seeded simulation function inside the database module. The same scenario name, input parameters, and seed produce the same result, making educational behavior testable and replayable without forcing future measurement-based modules into the same execution contract.
- Represent simulation events as discriminated unions with `simulated: true` so the UI can consistently communicate evidence boundaries.
- Keep logical database, logical partition, physical shard, database instance, compute node, and replica as distinct entities in the domain model.
- Represent replica lag with committed/applied operation versions; never synthesize wall-clock latency.
- Derive request eligibility from node availability and derive cross-shard fan-out from predicates plus shard ownership.
- Use a documented illustrative index cost model rather than imitating a production database query planner.
- Treat run results as immutable snapshots. Reset, run, replay, and compare are separate lifecycle commands.
- Keep database concepts in `src/modules/database`; shared lifecycle and presentation primitives belong in `src/simulations` and `src/components`.
- Use Vitest with jsdom and Testing Library for component behavior. Pure simulation tests remain independent of the DOM.
- Keep the first delivery in memory. No router, persistence layer, backend, or real database service is needed for the initial module.

## Dependency Graph

```text
Vite/React bootstrap
        |
        v
Foundation simulation contracts and deterministic runner
        |
        +--> Shared controls/timeline/explanation/question components
        |
        v
Database domain model and scenario engine
        |
        v
Database lab view + React Flow topology
        |
        v
Replay/reset/compare interactions and end-to-end component checks
```

## Task List

### Phase 1: Foundation

#### Task 1: Bootstrap the Vite application — complete

**Description:** Create the React TypeScript Vite application structure, package scripts, strict TypeScript configuration, Vitest/jsdom setup, and base styling.

**Acceptance criteria:**
- [x] `npm run dev`, `npm run build`, `npm run test`, and `npm run lint` scripts exist.
- [x] The app renders a local shell with a clear simulated-learning disclaimer.
- [x] TypeScript and test configuration support React components and pure TypeScript tests.

**Verification:**
- [x] Run `npm run build`.
- [x] Run `npm run test -- --run`.
- [x] Run `npm run lint`.

**Dependencies:** None

**Files likely touched:**
- `package.json`
- `vite.config.ts`
- `vitest.config.ts`
- `src/main.tsx`
- `src/styles/global.css`

**Estimated scope:** Medium

#### Task 2: Define foundation presentation and lifecycle contracts — complete

**Description:** Add narrow typed scenario identification/validation, event and explanation presentation contracts, immutable run snapshots, and replay/compare lifecycle utilities without database-specific execution behavior.

**Acceptance criteria:**
- [ ] Foundation types model scenario identity, ordered events, explanations, and decision questions.
- [ ] Lifecycle types distinguish reset, run, replay, and compare.
- [ ] Replay and comparison operate on stored immutable run results without mutating prior runs.

**Verification:**
- [ ] Add and run focused unit tests for determinism and immutable comparison.
- [ ] Run `npm run build`.

**Dependencies:** Task 1

**Files likely touched:**
- `src/simulations/types.ts`
- `src/simulations/deterministic.ts`
- `src/simulations/runHistory.ts`
- `src/simulations/foundation.test.ts`

**Estimated scope:** Medium

### Checkpoint: Foundation

- [x] Tests pass.
- [x] Production build succeeds.
- [x] Shared simulation contracts contain no database-specific rules.

### Phase 2: Database simulation

#### Task 3: Model database topology and allocation — complete

**Description:** Define database-lab domain types and deterministic topology allocation for partitioning, sharding, replication, shard-key distribution, and hot-partition scenarios.

**Acceptance criteria:**
- [x] The model distinguishes logical database, logical partition, physical shard, database instance, compute node, and replica.
- [x] Partitioning, sharding, and replication compose without collapsing entities.
- [x] Even and hot distributions produce explainable per-shard allocation differences.
- [x] Every logical record belongs to exactly one primary shard. Replicas may contain additional physical copies, but must not increase the logical record count; replica contents may temporarily lag behind their primary.
- [x] Invalid parameter combinations are rejected through typed validation/results rather than silently coerced.

**Verification:**
- [x] Add focused tests for topology shape, allocation totals, and hot-shard behavior.
- [x] Run `npm run test -- --run`.

**Dependencies:** Task 2

**Files likely touched:**
- `src/modules/database/model/types.ts`
- `src/modules/database/model/validation.ts`
- `src/modules/database/simulation/allocation.ts`
- `src/modules/database/simulation/allocation.test.ts`

**Estimated scope:** Medium

#### Task 4: Implement failure, replica, query, and index scenarios

**Description:** Extend the database engine with deterministic event sequences for replica lag, node failure/recovery, cross-shard queries/transactions, and indexed versus unindexed query plans.

**Acceptance criteria:**
- [x] Each required concept emits ordered events and a concrete explanation.
- [x] Replica lag uses monotonic applied operation versions and can produce a labeled stale-read possibility without claiming a real latency.
- [x] Failed nodes cannot serve successful requests; recovery and failover have explicit event semantics.
- [x] Cross-shard fan-out is derived from query predicates and shard ownership.
- [x] Cross-shard transaction limitations are visible in derived observations.
- [x] Query-plan output differentiates indexed lookup from unindexed scan using a documented simplified cost model.

**Verification:**
- [x] Add scenario tests covering all six database concepts.
- [x] Assert event order and simulation labels.
- [x] Run `npm run test -- --run`.

**Dependencies:** Task 3

**Files likely touched:**
- `src/modules/database/simulation/scenarios.ts`
- `src/modules/database/simulation/scenarios.test.ts`
- `src/modules/database/content.ts`
- `src/modules/database/index.ts`

**Estimated scope:** Medium

### Phase 3: Database lab vertical slice

#### Task 5: Build shared lab presentation components

**Description:** Create reusable controls, timeline, explanation, decision-question, and comparison panels that consume foundation contracts.

**Acceptance criteria:**
- [x] Controls expose accessible labels and typed change callbacks.
- [x] Timeline renders chronological events and distinguishes simulated observations.
- [x] Explanation and decision panels show mechanism, trade-off, failure mode, and question content.
- [x] Comparison view can display two run summaries without mutating either run.

**Verification:**
- [x] Add component tests for labels, event ordering, simulated-outcome labeling, and comparison rendering.
- [x] Run `npm run test -- --run`.

**Dependencies:** Task 2

**Files likely touched:**
- `src/components/ParameterControls.tsx`
- `src/components/EventTimeline.tsx`
- `src/components/ExplanationPanel.tsx`
- `src/components/DecisionQuestion.tsx`
- `src/components/ScenarioComparison.tsx`

**Estimated scope:** Medium

#### Task 6: Render the database architecture lab

**Description:** Compose the database scenario engine and shared components into a usable lab with a React Flow topology diagram, scenario presets, parameter controls, run/replay/reset/compare actions, and explicit simulation labeling.

**Acceptance criteria:**
- [x] Users can select the database concept/scenario and change relevant parameters.
- [x] React Flow displays nodes/replicas/relationships derived from the current result.
- [x] The interaction flow supports predict, modify, run, observe, explain, and compare.
- [x] Run, replay, reset, and compare are distinct actions and work on immutable run snapshots.
- [x] The six required concepts are reachable through the lab UI.
- [x] The UI never presents simulation values as production measurements.

**Verification:**
- [x] Add an integration test for the primary scenario flow.
- [x] Run `npm run build` and `npm run test -- --run`.
- [x] Manually verify keyboard-operable controls and readable failure explanations.

**Dependencies:** Tasks 4 and 5

**Files likely touched:**
- `src/modules/database/DatabaseLab.tsx`
- `src/modules/database/databaseLab.test.tsx`
- `src/components/ArchitectureDiagram.tsx`
- `src/app/App.tsx`
- `src/styles/global.css`

**Estimated scope:** Large; keep implementation focused on this single vertical slice.

### Checkpoint: Core module

- [x] All focused tests pass.
- [x] Build succeeds.
- [x] The database lab can run, replay, reset, and compare scenarios.
- [x] Simulation-versus-measurement labeling is visible in the primary flow.

### Phase 4: Polish and curriculum alignment

#### Task 7: Add curriculum caveats and accessibility polish

**Description:** Align database explanations with the study guide's evidence discipline, flag simplified models, and address keyboard/focus/contrast issues found during manual review.

**Acceptance criteria:**
- [x] Each simplified database mechanism has a concise caveat.
- [x] The study guide is treated as curriculum rather than production evidence.
- [x] Primary controls and results are keyboard accessible and visibly focused.

**Verification:**
- [x] Run the full test suite and build.
- [x] Perform a manual keyboard pass through the lab.

**Dependencies:** Task 6

**Files likely touched:**
- `src/modules/database/content.ts`
- `src/components/*.tsx`
- `src/styles/global.css`

**Estimated scope:** Medium

### Checkpoint: Complete

- [x] All success criteria in `SPEC.md` are satisfied.
- [x] Tests, lint, and build pass.
- [x] No cloud dependency or production benchmark claim was introduced.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Simulation rules leak into UI components | High | Keep pure scenario functions and pass only typed results into presentation components. |
| Educational model is mistaken for real database behavior | High | Add `simulated` markers in result types and persistent UI disclaimers/caveats. |
| React Flow integration dominates the first slice | Medium | Use a read-only derived topology diagram; defer editing the graph itself. |
| Too many controls make the first lab confusing | Medium | Organize controls by scenario and use presets with sensible bounded defaults. |
| Future modules diverge from foundation contracts | Medium | Keep foundation types generic and add module-specific discriminated unions at the boundary. |

## Open Questions

- No implementation-blocking questions remain. Revisit persistence, real browser measurements, and optional SQLite-WASM only when adding later modules.

---

# Implementation Plan: Distributed Correctness Lab

## Overview

Build the `distributed-correctness` module defined in
`SPEC-distributed-correctness.md` as a deterministic local simulator. The work
will extend the existing foundation contracts and shared lab components without
changing the Database Architecture Lab behavior.

## Architecture Decisions

- Keep all scenario execution pure and deterministic; failure points and retry
  limits are typed parameters rather than hidden timing or loops.
- Model client observations, server-side state, and business effects as
  separate values so timeout ambiguity cannot be silently collapsed into
  success or failure.
- Use stable request/message identities for idempotency and outbox delivery;
  describe "effectively once" as an application-level result built on
  duplicate-safe consumption, not as exactly-once transport.
- Reuse the foundation `RunSnapshot`, replay, reset, and comparison contracts.
- Reuse shared controls, timeline, explanation, decision, and comparison
  components; keep distributed rules in the module engine.
- Add module navigation only as much as needed to make both labs reachable;
  avoid introducing a router or persistence layer.

## Dependency Graph

```text
Distributed domain contracts
        |
        +--> Timeout ambiguity + bounded retries
        |          |
        |          +--> Idempotency
        |
        +--> Transactional outbox + duplicate-safe delivery
        |
        +--> Reconciliation + delivery semantics
        |
        v
Pure lab runner and controls
        |
        v
Distributed Correctness Lab UI
        |
        v
Module navigation, accessibility, browser verification
```

## Task List

### Phase 5: Distributed correctness engine

#### Task 8: Define domain contracts and timeout/retry scenarios — complete

**Description:** Add distributed-correctness types and a first vertical slice
for ambiguous request outcomes and bounded retry behavior.

**Acceptance criteria:**
- [x] Client-observed outcome and server-side commit state are represented
  separately.
- [x] Timeout ambiguity produces an explicit unknown outcome with possible
  server states.
- [x] Retry attempts respect an explicit bound and emit stable ordered events.
- [x] Identical parameters and seed produce equivalent results.

**Verification:**
- [x] Add focused pure simulation tests for ambiguity, retry bounds, event
  order, and determinism.
- [x] Run `npm run test -- --run`.

**Dependencies:** Existing foundation and database module

**Files likely touched:**
- `src/modules/distributed-correctness/model/types.ts`
- `src/modules/distributed-correctness/simulation/timeout.ts`
- `src/modules/distributed-correctness/simulation/timeout.test.ts`
- `src/modules/distributed-correctness/index.ts`

**Estimated scope:** Medium

#### Task 9: Add idempotency and transactional outbox scenarios — complete

**Description:** Extend the engine with duplicate-effect behavior, stable
idempotency keys, atomic business/outbox commits, delivery retries, and
duplicate-safe consumption.

**Acceptance criteria:**
- [x] Repeating a committed request without an idempotency key can create a
  duplicate business effect.
- [x] A stable idempotency key suppresses duplicate business effects while
  retaining attempt history.
- [x] Business state and the outbox record commit together in the model.
- [x] Outbox delivery and consumer deduplication emit explicit ordered events.

**Verification:**
- [x] Add tests for duplicate counts, atomic commit invariants, delivery
  retries, and idempotent consumption.
- [x] Run `npm run test -- --run`.

**Dependencies:** Task 8

**Files likely touched:**
- `src/modules/distributed-correctness/model/types.ts`
- `src/modules/distributed-correctness/simulation/idempotency.ts`
- `src/modules/distributed-correctness/simulation/outbox.ts`
- `src/modules/distributed-correctness/simulation/outbox.test.ts`

**Estimated scope:** Medium

#### Task 10: Add reconciliation and delivery-semantics scenarios — complete

**Description:** Add authoritative-versus-derived reconciliation and explicit
at-most-once, at-least-once, and effectively-once delivery comparisons.

**Acceptance criteria:**
- [x] Reconciliation reports missing, extra, and divergent records.
- [x] Repair actions are deterministic and preserve the mismatch evidence.
- [x] Delivery modes expose loss and duplicate trade-offs.
- [x] Effectively-once requires consumer idempotency and does not claim
  exactly-once transport.

**Verification:**
- [x] Add tests for mismatch classification, repair ordering, delivery
  semantics, and caveat text.
- [x] Run `npm run test -- --run`.

**Dependencies:** Task 9

**Files likely touched:**
- `src/modules/distributed-correctness/model/types.ts`
- `src/modules/distributed-correctness/simulation/reconciliation.ts`
- `src/modules/distributed-correctness/simulation/delivery.ts`
- `src/modules/distributed-correctness/simulation/distributed.test.ts`

**Estimated scope:** Medium

### Checkpoint: Distributed engine — complete

- [x] All distributed scenario tests pass.
- [x] Client observation, server state, and business effects remain distinct.
- [x] No scenario claims production reliability or exactly-once transport.
- [x] Existing database tests remain green.

### Phase 6: Distributed correctness vertical slice

#### Task 11: Create module content, parameter adapter, and lab runner — complete

**Description:** Adapt the pure engine results into the shared lab presentation
contract with scenario-specific fields, caveats, observations, and decision
questions.

**Acceptance criteria:**
- [x] All six scenario families are selectable.
- [x] Parameter fields expose retry, identity, delivery, failure, and state
  controls appropriate to the selected scenario.
- [x] Every result carries concise mechanism, trade-off, failure-mode, and
  simulation caveat content.

**Verification:**
- [x] Add adapter/content tests for every scenario and invalid parameter path.
- [x] Run `npm run test -- --run`.

**Dependencies:** Tasks 8-10

**Files likely touched:**
- `src/modules/distributed-correctness/content.ts`
- `src/modules/distributed-correctness/distributedCorrectnessControls.ts`
- `src/modules/distributed-correctness/labRunner.ts`
- `src/modules/distributed-correctness/labRunner.test.ts`

**Estimated scope:** Medium

#### Task 12: Compose the Distributed Correctness Lab UI — complete

**Description:** Build the lab view using shared controls and result panels,
including predict, run, replay, reset, compare, timeline, and outcome
comparison presentation.

**Acceptance criteria:**
- [x] The user can reach and run all six scenario families.
- [x] Ambiguous client/server outcomes are presented side by side.
- [x] Run, replay, reset, and compare operate on immutable snapshots.
- [x] Simulated results and decision questions are visible and accessible.

**Verification:**
- [x] Add integration tests for prediction-to-run, replay/reset, compare,
  ambiguity presentation, and scenario switching.
- [x] Run `npm run test -- --run` and `npm run build`.

**Dependencies:** Task 11

**Files likely touched:**
- `src/modules/distributed-correctness/DistributedCorrectnessLab.tsx`
- `src/modules/distributed-correctness/DistributedCorrectnessLab.test.tsx`
- `src/app/App.tsx`
- `src/styles/global.css`

**Estimated scope:** Medium

### Phase 7: Polish and verification

#### Task 13: Add module navigation, caveats, accessibility, and browser checks — complete

**Description:** Make both labs clearly reachable, align visual language and
responsive behavior, and verify the new flow in a real browser.

**Acceptance criteria:**
- [x] Existing Database Architecture Lab behavior remains available.
- [x] Distributed-correctness caveats distinguish modeled outcomes from
  production guarantees.
- [x] Primary controls are keyboard-operable with visible focus states.
- [x] Narrow and desktop layouts do not create unintended overflow.
- [x] Browser console has no errors or warnings during the primary flow.

**Verification:**
- [x] Run full tests, build, and lint.
- [x] Exercise the distributed lab in the browser at desktop and 375px widths.
- [x] Verify run, replay, reset, compare, and scenario switching manually.

**Dependencies:** Task 12

**Files likely touched:**
- `src/app/App.tsx`
- `src/components/ModuleNavigation.tsx`
- `src/components/ModuleNavigation.test.tsx`
- `src/styles/global.css`

**Estimated scope:** Medium

### Checkpoint: Distributed Correctness complete

- [x] All success criteria in `SPEC-distributed-correctness.md` are satisfied.
- [x] Existing database tests and UI behavior remain green.
- [x] Full test, build, lint, and browser checks pass.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Timeout ambiguity is collapsed into a boolean success/failure | High | Use separate client-observed and server-state discriminated unions and test unknown outcomes. |
| Retry loops hide duplicate side effects | High | Make attempt limits and stable identities explicit parameters and observations. |
| "Exactly once" language overpromises transport guarantees | High | Use effectively-once only for idempotent application handling and include caveats. |
| Outbox and reconciliation become generic infrastructure abstractions | Medium | Keep each scenario small and curriculum-focused with explicit event contracts. |
| Adding a second lab regresses the existing database flow | Medium | Preserve the current lab integration tests and run the full suite at every checkpoint. |
| Mobile layout inherits intrinsic-width issues from result tables | Medium | Apply grid-item min-width constraints and browser-check 375px before completion. |

## Open Questions

- Whether the first app shell should use a simple in-page module selector or
  introduce a router remains intentionally limited to the navigation task.
- The outbox and reconciliation scenarios should remain separate types unless
  implementation evidence shows a shared record model improves clarity without
  obscuring their teaching goals.

## Phase 8: React Performance measurement foundation

The React Performance Lab is defined by `SPEC-react-performance.md`. Unlike the
database and distributed-correctness modules, it measures controlled workloads
in the active browser. Workload inputs are reproducible, but timing values are
environment-dependent observations.

### Architecture decisions

- Keep browser measurement contracts inside
  `src/modules/react-performance/`; shared controls and result panels remain
  presentation-only.
- Separate render-function invocation counts, React Profiler commits,
  paint-scheduling observations, and browser responsiveness metrics.
- Store counters and timings in isolated mutable buffers during a measured
  interval; publish one result after the interval so instrumentation does not
  trigger measured React state updates.
- Use equivalent workload inputs, component structure, instrumentation, and
  runtime configuration for baseline and optimized variants.
- Treat replay as re-displaying an immutable captured measurement snapshot, not
  rerunning browser work.
- Use a local inline/module Web Worker and explicit cleanup; do not add a
  dependency or external service.

#### Task 14: Define measurement contracts and bounded workloads — complete

**Description:** Add typed scenario, variant, evidence, metric, lifecycle, and
measurement-buffer contracts plus deterministic bounded workloads that can run
in a browser and be tested without asserting fixed timing values.

**Acceptance criteria:**
- [x] Metric/unit combinations are type-safe for measured counts, durations,
  worker round trips, responsiveness observations, and unsupported metrics.
- [x] Workload parameters are validated and bounded without silently accepting
  invalid input.
- [x] Measurement buffers can collect observations without React state updates
  during the measured interval.
- [x] Runtime and evidence caveats distinguish browser measurements from
  illustrative workload inputs and production benchmarks.

**Verification:**
- [x] Add focused Vitest coverage for validation, workload determinism, buffer
  isolation, and evidence-shape contracts.
- [x] Run the focused React Performance tests and `npm run lint`.

**Dependencies:** Existing foundation and completed modules

**Files likely touched:**
- `src/modules/react-performance/model/types.ts`
- `src/modules/react-performance/measurement/workloads.ts`
- `src/modules/react-performance/measurement/buffer.ts`
- `src/modules/react-performance/measurement/measurement.test.ts`

**Estimated scope:** Medium

#### Task 15: Implement render and derived-computation measurement slices — complete

**Description:** Implement the render-propagation/memoization and derived
computation scenarios, including distinct render invocation and Profiler commit
observations and the three required prop-identity variants.

**Acceptance criteria:**
- [x] The render scenario compares non-memoized unstable props, memoized
  unstable props, and memoized stable props during an unrelated parent update.
- [x] Render-function invocation counts are separate from commit count and
  `actualDuration`.
- [x] Derived computation compares recomputation with memoized reuse while
  preserving equivalent inputs and instrumentation.
- [x] Strict Mode/runtime configuration is recorded with each measurement.

**Verification:**
- [x] Add Vitest tests for scenario configuration and result shapes.
- [x] Add Testing Library coverage for instrumented workload completion without
  counters being published through per-render state updates.
- [x] Run focused tests and `npm run build`.

**Dependencies:** Task 14

**Files likely touched:**
- `src/modules/react-performance/measurement/rendering.tsx`
- `src/modules/react-performance/measurement/computation.ts`
- `src/modules/react-performance/measurement/rendering.test.tsx`
- `src/modules/react-performance/measurement/computation.test.ts`

**Estimated scope:** Medium

#### Task 16: Implement worker and responsiveness measurement slices — complete

**Description:** Add the local worker protocol and responsiveness observers for
main-thread task duration, input delay, interaction latency, long-task evidence,
and worker round trips, with explicit unsupported states and cleanup.

**Acceptance criteria:**
- [x] Main-thread and worker-backed calculations use equivalent bounded inputs.
- [x] Worker startup, serialization, scheduling, and teardown are described as
  contributors to the measured round trip unless independently measured.
- [x] Worker success, error, timeout/cleanup, and unmount paths terminate
  resources deterministically.
- [x] Responsiveness metrics remain distinct and unsupported browser APIs are
  represented explicitly rather than as zero.

**Verification:**
- [x] Add Vitest coverage for the worker message protocol, errors, cleanup,
  responsiveness summaries, and unsupported metrics.
- [x] Run focused tests and `npm run lint`.

**Dependencies:** Task 14

**Files likely touched:**
- `src/modules/react-performance/measurement/worker.ts`
- `src/modules/react-performance/measurement/responsiveness.ts`
- `src/modules/react-performance/measurement/worker.test.ts`
- `src/modules/react-performance/measurement/responsiveness.test.ts`

**Estimated scope:** Medium

### Checkpoint: Measurement foundation

- [x] Tasks 14-16 are complete.
- [x] Measurement contracts do not fabricate timing values.
- [x] Full existing test suite remains green.
- [x] Build and lint pass.

## Phase 9: React Performance vertical slice

#### Task 17: Add module content, controls, and lab runner

**Description:** Adapt the four browser measurement scenarios into the shared
lab presentation contract with typed controls, evidence labels, explanations,
caveats, and decision questions.

**Acceptance criteria:**
- [x] Render propagation, derived computation, worker offload, and
  responsiveness are selectable scenarios.
- [x] Baseline and optimized variants expose equivalent workload controls.
- [x] Results preserve measured versus unsupported evidence and show the
  runtime/configuration caveat.
- [x] Decision questions teach trade-offs instead of assuming optimization is
  beneficial.

**Verification:**
- [x] Add adapter/content tests for every scenario and invalid parameter path.
- [x] Run the focused adapter tests and `npm run build`.

**Dependencies:** Tasks 15-16

**Files likely touched:**
- `src/modules/react-performance/content.ts`
- `src/modules/react-performance/reactPerformanceControls.ts`
- `src/modules/react-performance/labRunner.ts`
- `src/modules/react-performance/labRunner.test.ts`

**Estimated scope:** Medium

#### Task 18: Compose the React Performance Lab UI and module integration

**Description:** Build the lab view with run, immutable snapshot replay,
compare, reset, evidence presentation, and integration into existing module
navigation without changing existing lab behavior.

**Acceptance criteria:**
- [x] A user can run each scenario and see render, commit, worker, and
  responsiveness observations with clear evidence labels.
- [x] Results are published after measurement rather than through instrumentation
  state updates inside the measured workload.
- [x] Run, replay, compare, and reset preserve immutable captured measurements;
  replay does not rerun browser work.
- [x] Existing Database Architecture and Distributed Correctness navigation and
  behavior remain available.

**Verification:**
- [x] Add Testing Library integration tests for scenario switching, run,
  replay, reset, compare, caveats, and unsupported metrics.
- [x] Run the full test suite and `npm run build`.

**Dependencies:** Task 17

**Files likely touched:**
- `src/modules/react-performance/ReactPerformanceLab.tsx`
- `src/modules/react-performance/ReactPerformanceLab.test.tsx`
- `src/modules/react-performance/index.ts`
- `src/app/App.tsx`
- `src/styles/global.css`

**Estimated scope:** Medium

### Checkpoint: React Performance vertical slice

- [x] Tasks 17-18 are complete.
- [x] The module is reachable from navigation.
- [x] Existing module tests remain green.
- [x] Full tests and build pass.

## Phase 10: Browser verification and completion

#### Task 19: Verify real-browser measurements and responsive UX

**Description:** Exercise every React Performance scenario in a real browser,
verify measurement semantics and cleanup, and finish the module documentation
and checklists.

**Acceptance criteria:**
- [x] Desktop and 375px layouts have no unintended horizontal overflow.
- [x] Genuine pointer/keyboard interactions are used for responsiveness checks
  where possible.
- [x] Render invocations, commits, paint observations, task/input/interaction
  metrics, and worker round trips are not conflated.
- [x] Unsupported metrics are explicit, worker/observer resources are cleaned
  up, and the browser console remains clean.

**Verification:**
- [x] Run full tests, build, and lint.
- [x] Exercise all four scenarios, compare, replay, reset, and navigation in a
  real browser.
- [x] Capture desktop and 375px browser checks and review the final diff.

**Dependencies:** Task 18

**Files likely touched:**
- `SPEC-react-performance.md`
- `tasks/plan.md`
- `tasks/todo.md`

**Estimated scope:** Small

### Checkpoint: React Performance complete

- [x] All success criteria in `SPEC-react-performance.md` are satisfied.
- [x] Existing database and distributed-correctness behavior remains green.
- [x] Full test, build, lint, and browser checks pass.

## React Performance risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Instrumentation triggers extra renders or commits | High | Use isolated mutable buffers and publish only after measurement. |
| Render invocations are mistaken for visible updates | High | Report invocations, commits, and paint observations as separate metrics. |
| Baseline and optimized variants measure different work | High | Share inputs, structure, instrumentation, and runtime configuration. |
| Worker round-trip is described as independently attributed costs | Medium | Label startup, serialization, scheduling, and teardown as included contributors unless separately measured. |
| Browser support makes responsiveness metrics unavailable | Medium | Use discriminated unsupported evidence and never fabricate zero values. |
| Timing assertions become flaky | Medium | Assert result shape and qualitative behavior; reserve absolute checks for browser review, not unit tests. |
