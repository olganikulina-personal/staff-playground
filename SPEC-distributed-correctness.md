# Spec: Distributed Correctness Lab

## Objective

Add a second interactive learning module to the Staff Engineering Architecture
Playground for experienced Senior+/Staff engineers. The Distributed Correctness
Lab will make ambiguous outcomes and recovery mechanisms visible through
deterministic local simulations rather than real network calls.

The first slice will let a learner:

1. Observe how a timeout can leave the client unable to distinguish
   "committed but response lost" from "rejected before commit".
2. Compare no retry, bounded retry, and retry-after-timeout behavior.
3. Compare duplicate side effects with and without an idempotency key.
4. Trace a transactional outbox from business-state commit through delivery and
   duplicate-safe consumption.
5. Reconcile a derived state with an authoritative source and inspect the
   resulting repair actions.
6. Compare at-most-once, at-least-once, and effectively-once delivery semantics
   without claiming that a distributed system provides universal exactly-once
   execution.

The module must teach mechanisms and trade-offs, not reproduce a production
queue, database, network, or service. Every result must be visibly labeled as
an illustrative simulation.

## Tech Stack

- Existing Vite, React, and strict TypeScript application
- Existing foundation simulation contracts and lifecycle utilities
- Existing shared controls, timeline, explanation, decision, and comparison
  components
- Vitest and Testing Library
- No new dependency, cloud service, network call, database server, or durable
  storage

## Commands

```text
npm run dev
npm run build
npm run test -- --run
npm run lint
```

## Project Structure

```text
src/
  modules/
    distributed-correctness/
      model/              Typed requests, outcomes, effects, and delivery states
      simulation/         Pure deterministic scenario engines
      content.ts          Caveats and architecture decision questions
      index.ts            Public module exports
      DistributedCorrectnessLab.tsx
      distributedCorrectness.test.tsx
  components/             Reuse existing shared lab presentation primitives
  simulations/            Reuse foundation lifecycle and event contracts
```

The module must not place distributed-correctness rules in shared presentation
components. The app shell may expose the module through the existing module
composition boundary, but this slice does not require routing or persistence.

## Simulation Contract

Each scenario is a pure function of:

- A named scenario.
- Typed parameters.
- A numeric deterministic seed.

Each result contains:

- Final authoritative and derived state where applicable.
- Ordered logical events.
- Explicit client-observed outcome and server-side outcome when they differ.
- Side-effect count and duplicate-effect count where relevant.
- Delivery attempts, acknowledgement state, and repair actions where relevant.
- Explanations tied to mechanisms, trade-offs, and failure modes.
- A decision question with reasoning focus.
- `simulated: true` event labels inherited from the foundation contract.

Identical scenario, parameters, and seed values must produce structurally
equivalent results. No wall-clock time, browser randomness, network request, or
environment-dependent state may affect execution.

### Scenario semantics

#### Timeout ambiguity

The simulation exposes a request lifecycle with deterministic points for:

- Request accepted.
- Business effect committed.
- Response delivered or lost.
- Client timeout.

The client-facing observation must distinguish known success, known rejection,
and unknown outcome. An unknown outcome is not silently treated as failure.
The result must show the possible server-side states that remain consistent
with the client observation.

#### Retries

The learner can select a retry policy:

- No retry.
- Bounded retry count.
- Retry after an ambiguous timeout.

The engine must report attempt count, terminal client outcome, and whether a
retry may repeat a side effect. Retry limits must be explicit parameters, not
hidden loops.

#### Idempotency

The simulation compares repeated requests carrying no idempotency key with
repeated requests carrying a stable key. A matching key may suppress duplicate
business effects after the first committed operation. The result must preserve
the distinction between request deduplication and exactly-once execution.

#### Transactional outbox

The model represents one local transaction that commits business state and an
outbox record together. A separate delivery step may fail, retry, or deliver
the same outbox record more than once. The consumer can use an idempotent
deduplication key. The event timeline must show the atomic local commit
boundary separately from asynchronous delivery.

#### Reconciliation

The simulation compares an authoritative source record set with a derived
record set. It reports missing, extra, and divergent records, then emits
deterministic repair actions. Reconciliation must not erase the evidence of the
detected mismatch, and it must identify which side is authoritative.

#### Delivery semantics

The learner can compare:

- At-most-once: a delivery is not retried after the chosen send point, so loss
  is possible but duplicate delivery is not modeled.
- At-least-once: delivery retries can cause duplicates, so consumers must
  tolerate repeated messages.
- Effectively-once: at-least-once transport plus idempotent consumer handling
  produces one modeled business effect for a stable message identity.

The UI and explanations must explicitly state that "effectively once" is a
modeled application outcome, not a universal transport guarantee.

## Interaction Model

The lab follows the existing playground loop:

1. Select a distributed-correctness scenario.
2. Adjust failure, retry, identity, delivery, or state parameters.
3. Enter a prediction.
4. Run or replay the deterministic scenario.
5. Inspect the event timeline and outcome comparison.
6. Read the mechanism, trade-off, and failure-mode explanation.
7. Answer a decision question.
8. Reset or compare two immutable runs.

The first UI may use a summary diagram rather than a full infrastructure graph.
If a diagram is included, it must be derived from the simulation result and
must remain a presentation component.

## Code Style

Keep scenario behavior in pure functions with explicit domain names and
discriminated unions:

```ts
export type RequestOutcome =
  | {
      kind: "known-success";
      committed: true;
      responseDelivered: true;
    }
  | {
      kind: "unknown-after-timeout";
      committed: boolean | "unknown";
      responseDelivered: false;
    }
  | {
      kind: "known-rejection";
      committed: false;
      responseDelivered: true;
    };

export function runTimeoutScenario(
  input: TimeoutScenarioInput,
): TimeoutScenarioResult {
  // Deterministic teaching model; no network or wall-clock access.
}
```

Conventions:

- Use `PascalCase` for React components and `camelCase` for functions and
  variables.
- Name ambiguity explicitly (`clientObservedOutcome`,
  `serverCommitState`, `duplicateEffectCount`).
- Prefer discriminated unions over optional fields with ambiguous meaning.
- Keep retry limits and failure points in typed parameters.
- Keep caveats next to the scenario result or curriculum content.
- Do not add comments that merely restate code.

## Testing Strategy

Use Vitest for pure simulation behavior and Testing Library for the lab
interaction flow.

Required simulation coverage:

- Determinism for identical inputs and seeds.
- Timeout ambiguity preserves unknown client outcomes instead of silently
  converting them to failure.
- Retry attempt counts respect explicit bounds.
- Retries without idempotency can duplicate a committed business effect.
- Stable idempotency keys suppress duplicate business effects.
- Outbox business state and outbox record commit atomically in the model.
- Outbox delivery retries and duplicate-safe consumption are visible in event
  order.
- Reconciliation reports missing, extra, and divergent records and emits
  deterministic repairs.
- Delivery semantics expose the expected loss/duplicate trade-off.
- Effectively-once behavior depends on consumer idempotency, not a false
  exactly-once transport claim.
- Replay and comparison do not mutate prior immutable snapshots.

Required UI coverage:

- All scenarios are selectable with labeled controls.
- Prediction, run, replay, reset, and compare actions work.
- Timeline and result panels visibly label simulated outcomes.
- The UI displays client-observed versus server-side outcomes when ambiguous.
- Decision questions and caveats are rendered for each scenario.
- Primary controls are keyboard-operable.

Tests should assert educational invariants and stable event contracts, not
production latency thresholds or implementation-private DOM structure.

## Boundaries

- **Always:** Keep execution deterministic and local; preserve the distinction
  between client observation and server state; label simulated outcomes; make
  retry limits, identity, delivery, and authority explicit; test domain
  behavior before wiring the UI; reuse foundation lifecycle contracts.
- **Ask first:** Adding real network calls, workers, queue/database services,
  persistence, analytics, telemetry, external dependencies, or changing the
  approved module dependency direction.
- **Never:** Claim exactly-once transport; silently treat an ambiguous timeout
  as failure; hide retries or deduplication behavior; present simulation
  counts as production reliability measurements; remove failing tests to make
  the suite pass; put distributed-correctness rules in shared diagram or
  control components.

## Success Criteria

- A new Distributed Correctness Lab is reachable from the application without
  changing the existing Database Architecture Lab behavior.
- All six scenario families are represented: timeout ambiguity, retries,
  idempotency, transactional outbox, reconciliation, and delivery semantics.
- Identical inputs and seed produce identical results.
- Timeout ambiguity, duplicate effects, outbox atomicity, reconciliation
  mismatches, and delivery trade-offs are visible in ordered events.
- Retry bounds and idempotency keys have observable, test-covered effects.
- Results clearly separate client observations, server-side state, and modeled
  business effects.
- Reset, run, replay, and compare work on immutable run snapshots.
- The UI labels all outcomes as illustrative simulations and avoids production
  guarantees.
- Full tests, build, and lint pass, and the primary interaction flow is
  keyboard-operable.

## Open Questions

- Should the first UI expose all six scenario families in one selector, or use
  a smaller guided sequence with scenario-specific presets?
- Should the outbox and reconciliation scenarios share a common record model,
  or use separate types to keep each explanation simpler?
- Should module navigation be added now, or should the app shell temporarily
  render both labs in a vertical sequence?
