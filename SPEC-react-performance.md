# Spec: React Performance Lab

## Objective

Add a third interactive learning module to the Staff Engineering Architecture
Playground for experienced Senior+/Staff engineers. The React Performance Lab
will let a learner compare common rendering and responsiveness mechanisms in a
real browser using controlled local workloads and measured browser observations.

The first slice will let a learner:

1. Observe how parent updates propagate into child renders.
2. Compare unstable props with stable props and intentional memoization.
3. Compare repeated derived work with memoized derived work across unrelated
   updates.
4. Compare CPU-heavy work on the main thread with the same work in a Web
   Worker.
5. Observe responsiveness consequences through measured interaction delay and
   long-task evidence where the browser supports it.
6. Interpret render counts, commit durations, computation duration, worker
   round-trip duration, and responsiveness observations without treating them as
   production benchmarks.

The lab must teach measurement before optimization. It must not claim that
`React.memo`, `useMemo`, workers, or any single technique is universally
beneficial.

## Assumptions

1. The module runs in the existing Vite React application and targets modern
   browsers with Web Worker support.
2. Measurements are collected locally in the active browser; no network calls,
   backend, telemetry, cloud service, or durable storage is required.
3. Workloads are deterministic in their inputs, but measured durations are
   environment-dependent and must be labeled accordingly.
4. The first slice uses the existing module navigation and shared presentation
   components rather than introducing a new routing system.
5. React development-mode instrumentation is acceptable for the learning lab;
   results are observations of the lab environment, not production-mode
   performance claims.

## Tech Stack

- Existing Vite, React 19, and strict TypeScript application
- Existing foundation lifecycle and shared lab presentation contracts where
  applicable
- React Profiler API for commit measurements
- Browser Performance APIs (`performance.now`, marks/measures, and optional
  `PerformanceObserver`)
- Web Worker API using a local inline worker or module URL; no external worker
  service
- Vitest and Testing Library for pure contracts and component behavior
- Playwright/browser verification for real measurement scenarios
- No new dependency, cloud service, network call, database server, or durable
  storage

## Commands

```text
npm run dev
npm run build
npm run test -- --run
npm run lint
```

Browser verification uses the local Vite server and must cover both desktop and
375px layouts.

## Project Structure

```text
src/
  modules/
    react-performance/
      model/              Typed scenarios, variants, metrics, and observations
      measurement/        Browser measurement and worker helpers
      content.ts          Caveats and architecture decision questions
      labRunner.ts        Scenario adapter for the shared lab presentation
      ReactPerformanceLab.tsx
      ReactPerformanceLab.test.tsx
      index.ts
  components/             Reuse shared controls, timeline, explanations,
                          decisions, comparison, and module navigation
  simulations/             Reuse foundation lifecycle contracts where useful
```

React-specific workload behavior and measurement rules belong inside the
module. Shared presentation components must not know how render counts,
Profiler commits, worker timing, or responsiveness metrics are produced.

## Measurement Contract

Each measurement run is a pure configuration plus a browser execution. The
configuration includes:

- A named performance scenario.
- A baseline or optimized variant.
- Typed workload parameters.
- A deterministic numeric seed where the workload needs one.

The browser execution returns:

- Scenario and variant identity.
- Render-function invocation counts for instrumented components.
- React Profiler commit count and `actualDuration` values where available.
- Browser paint or paint-scheduling observations only when the browser API
  supports them; these must not be conflated with render invocations or React
  commits.
- Work duration measured with `performance.now`.
- Worker request, completion, and round-trip observations where applicable.
- Responsiveness observations with a precise metric type: main-thread task
  duration, input delay, interaction latency, long-task evidence, or worker
  round-trip.
- Ordered local measurement events with explicit `simulated` or
  `measured-in-browser` evidence labels.
- Caveats describing browser, mode, workload, and support limitations.

Repeated runs must preserve the same workload inputs and measurement shape, but
the module must not promise identical timing values. Timing-sensitive tests
must assert contracts and qualitative relationships only where the environment
can support them; they must never assert hard-coded millisecond values.

Render-function invocation counts must be labeled as render attempts, not
committed renders. React may invoke a render function without committing it,
and development Strict Mode may invoke rendering logic more than once. The
lab must disclose the active runtime configuration and use equivalent
development/Strict Mode settings for baseline and optimized variants.

Measurement instrumentation must not trigger React state updates inside the
measured workload. Render counters, timing values, and event records must be
written to isolated mutable measurement buffers and published to the
presentation layer only after the measured interval completes. Baseline and
optimized variants must use equivalent component structure, inputs, workload
size, instrumentation, and runtime configuration so the comparison isolates
the mechanism being taught.

The UI must distinguish:

- **Measured in this browser:** values collected from the active browser.
- **Illustrative workload:** the controlled work used to expose a mechanism.
- **Not a production benchmark:** no cross-device, production-mode, or
  real-user conclusion is implied.

### Evidence types

Measurement evidence must prevent invalid metric/unit combinations:

```ts
export type MeasurementEvidence =
  | {
      kind: "measured-in-browser";
      metric:
        | "commit-duration"
        | "work-duration"
        | "worker-round-trip"
        | "input-delay"
        | "interaction-latency"
        | "main-thread-task"
        | "long-task";
      value: number;
      unit: "milliseconds";
    }
  | {
      kind: "measured-in-browser";
      metric: "render-invocations" | "commit-count" | "calculation-count";
      value: number;
      unit: "count";
    }
  | {
      kind: "unsupported";
      metric:
        | "long-task"
        | "input-delay"
        | "interaction-latency"
        | "paint";
      reason: string;
    };
```

## Scenario Semantics

### Render propagation and memoization

The lab performs an unrelated parent update while the child's meaningful inputs
remain unchanged. It compares at least these variants:

- A non-memoized child receiving newly-created props.
- A memoized child receiving newly-created props.
- A memoized child receiving stable props.

It reports render-function invocation counts separately from Profiler commit
counts and durations. The explanation must state that `React.memo` does not
generally prevent rerenders when prop identity changes, that stable references
and memoization solve different parts of the problem, and that memoization has
comparison cost.

### Derived computation and `useMemo`

The lab performs a deterministic CPU-bound derived calculation from a bounded
input. An unrelated state update reruns the scenario. The baseline recomputes
the value; the optimized variant may memoize it. The result reports the
calculation count and measured work duration, while explicitly noting that
memoization can retain memory and can be neutral when computation is cheap or
dependencies change frequently.

### Main-thread work and Web Worker offload

The lab compares a bounded deterministic calculation on the main thread with
the same calculation in a local Web Worker. It reports completion, work
duration, worker round-trip duration, and event order. Worker startup,
serialization, scheduling, and teardown costs must remain visible rather than
being hidden from the learner. A single end-to-end worker round-trip cannot
independently attribute each contributor; the UI must label those costs as
contributors included in the measured round trip unless separate observations
are collected. A worker result must not be described as automatically faster;
the teaching point is main-thread isolation and the trade-off boundary.

### Responsiveness

The lab runs a genuine user interaction while a bounded workload is active and
reports the most precise supported observation:

- **Main-thread task duration:** how long synchronous work occupied the main
  thread.
- **Input delay:** time from the browser input timestamp to handler start.
- **Interaction latency:** time from input through processing and the available
  presentation boundary.
- **Long-task observation:** evidence of a task exceeding the browser's
  long-task threshold.
- **Worker round-trip:** time from dispatching worker work to receiving its
  result.

These metrics are not interchangeable. Programmatically dispatching an event
must not be presented as equivalent to genuine browser input scheduling.
Playwright verification should use real pointer or keyboard interactions where
possible. If a browser does not expose a requested metric, the result must say
so explicitly rather than returning a fabricated zero. The scenario may
compare blocking work with an explicitly yielded or worker-backed variant, but
it must not claim to model every scheduler, device, or input condition.

## Interaction Model

The lab follows the existing playground loop:

1. Select a React-performance scenario.
2. Choose the baseline or optimized mechanism and workload parameters.
3. Run the measurement in the current browser.
4. Inspect measured observations and the ordered local event timeline.
5. Read the mechanism, trade-off, and failure-mode explanation.
6. Answer a decision question about whether the optimization is justified.
7. Compare two immutable measurement snapshots or reset the scenario.

The lab should provide a clear action to run a fresh measurement because
browser timing is not replayable in the same sense as deterministic simulation.
Replay, if exposed through the shared lifecycle, must be labeled as
re-displaying the captured snapshot rather than re-running browser work.

## Code Style

Keep workload and measurement behavior in typed module functions with explicit
metric names. React components own presentation and interaction, not timing
bookkeeping or worker protocol details.

```ts
export type PerformanceEvidence =
  | {
      kind: "measured-in-browser";
      metric:
        | "commit-duration"
        | "work-duration"
        | "worker-round-trip"
        | "input-delay"
        | "interaction-latency"
        | "main-thread-task";
      value: number;
      unit: "milliseconds";
    }
  | {
      kind: "measured-in-browser";
      metric: "render-invocations" | "commit-count" | "calculation-count";
      value: number;
      unit: "count";
    }
  | {
      kind: "unsupported";
      metric:
        | "long-task"
        | "input-delay"
        | "interaction-latency"
        | "paint";
      reason: string;
    };

export type PerformanceVariant = "baseline" | "optimized";

export function summarizeMeasurement(
  input: MeasurementInput,
): MeasurementSummary {
  // Browser measurements are observations, not deterministic benchmark claims.
}
```

Conventions:

- Use `PascalCase` for React components and `camelCase` for functions and
  variables.
- Name metrics explicitly (`childRenderCount`, `commitDurationMs`,
  `workerRoundTripMs`, `inputDelayMs`).
- Prefer discriminated unions for supported versus unsupported browser metrics.
- Keep workload sizes bounded and user-visible.
- Do not add comments that merely restate code.

## Testing Strategy

Use Vitest for pure workload, validation, summary, and worker-protocol
contracts. Use Testing Library for the lab's controls, evidence labels,
comparison, reset, and unsupported-metric presentation. Use browser
verification for APIs that jsdom cannot faithfully provide.

Required coverage:

- Workload configuration validation and bounded input handling.
- Stable measurement-result shapes and evidence labels.
- Render-invocation counts, React Profiler commit counts/durations, and
  optional paint-scheduling observations remain distinct.
- Instrumentation buffers do not trigger state updates inside measured work.
- Worker success, worker error, and cleanup paths.
- Unsupported `PerformanceObserver` or input-delay paths are explicit.
- Responsiveness metric types are not collapsed into a generic latency value.
- Scenario switching, run, snapshot comparison, reset, and caveat rendering.
- Identical configurations preserve workload inputs while timing values remain
  unconstrained.
- Existing Database Architecture and Distributed Correctness labs remain green.

Browser verification must confirm:

- The four scenarios can run in a real browser.
- Measured values are visibly labeled and not presented as production
  guarantees.
- Worker and main-thread paths complete without console errors.
- The narrow layout has no horizontal overflow.
- Primary controls are keyboard-operable with visible focus.

## Boundaries

- **Always:** Measure before explaining an optimization; label browser evidence;
  keep workload bounds explicit; preserve unsupported metrics as explicit
  states; clean up workers and observers; run the full relevant test/build/lint
  checks.
- **Ask first:** Adding a dependency such as `web-vitals`; changing the
  foundation lifecycle contract; adding persistent telemetry; changing module
  navigation semantics; introducing production-mode benchmark claims.
- **Never:** Use network calls or external services; fabricate timing values;
  read credentials or unrelated browser state; claim exactly reproducible
  browser durations; present a local workload as a universal React rule; weaken
  or delete tests to make timing assertions pass.

## Success Criteria

1. A user can reach the React Performance Lab from module navigation without
   regressing either existing lab.
2. Render propagation, derived computation, worker offload, and responsiveness
   are independently selectable scenarios.
3. Each scenario produces measured-in-browser or explicitly unsupported
   evidence, never fabricated timing.
4. Render-function invocations, React commits, paint observations, computation
   and worker observations, and responsiveness evidence are distinct and
   visible with clear baseline/optimized labels.
5. Instrumentation does not add state updates to measured work, and baseline
   and optimized variants use equivalent workloads and runtime configuration.
6. Worker and observer resources are cleaned up on completion, reset, and
   unmount.
7. Run, compare, reset, and any replay behavior preserve immutable captured
   measurement snapshots and do not silently rerun work.
8. Explanations include mechanism, trade-off, failure mode, and a
   not-a-production-benchmark caveat.
9. Focused tests, full tests, build, lint, desktop browser verification, and
   375px browser verification pass with a clean console.

## Open Questions

- None required before implementation. The approved capability map establishes
  real browser measurement as the module boundary; absolute timing thresholds
  are intentionally excluded because they would be environment-specific.
