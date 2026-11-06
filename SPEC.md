# Spec: Staff Engineering Architecture Playground

## Objective

Build a local, browser-based interactive learning playground for experienced Senior+/Staff engineers. The playground turns the supplied Staff Engineering Podcast Companion study guide into experiments where users can change architectural parameters, introduce failures, inspect an event timeline, answer design questions, and connect observed behavior to the underlying mechanism.

The first shipped learning module is the **Database Architecture Lab**. It teaches:

1. Partitioning versus sharding versus replication.
2. Shard-key selection and hot partitions.
3. Read replicas and replication lag.
4. Node failure and recovery.
5. Cross-shard queries and transactions.
6. Indexes and query plans.

The product must distinguish **simulated outcomes** from **measurements of real code**. The database lab is a deterministic teaching simulation; it must label its results as illustrative and must not present them as production benchmarks or guarantees.

## Capability Boundaries

The approved module dependency direction is recorded in `CAPABILITY-MAP.md`.

### `playground-foundation`

Owns the stable contracts shared by all labs:

- Scenario state and parameter-validation schemas.
- Ordered timeline events with explanatory metadata.
- Reset, replay, and scenario comparison primitives.
- Shared architecture-diagram, control, timeline, explanation, and decision-question UI building blocks.
- Curriculum metadata and module navigation.

It does not own module-specific execution engines, database concepts, database formulas, or production integrations. Modules may use deterministic simulation, real browser measurements, or another execution model behind their own boundary.

### `database-architecture`

Owns database-lab state transitions and educational content:

- Dataset, node, partition, replica, shard-key, failure, query, and index models.
- Deterministic allocation and request-routing simulation.
- Hot-partition, lag, failure/recovery, cross-shard, and query-plan outcomes.
- Scenario presets and architecture decision questions.
- Database-specific explanations and invariants.

It consumes foundation interfaces and emits simulation results; UI components should not duplicate simulation rules.

### Future modules

`distributed-correctness`, `react-performance`, `networking`, `caching-and-messaging`, and `system-design` remain outside the first implementation. They may add module-specific engines and views through the foundation contracts, but must not be implemented as part of this slice.

## Tech Stack

- Vite
- React
- TypeScript with strict type checking
- React Flow for architecture diagrams
- Vitest and Testing Library for unit/component tests
- No cloud services, network calls, database servers, or required external runtime dependencies

The initial implementation may add only the dependencies needed for this stack. Browser APIs may be used for UI behavior, but the database lab must remain deterministic and local.

## Commands

The implementation will provide these commands:

```text
npm run dev
npm run build
npm run test
npm run test -- --run
npm run lint
```

The exact package scripts are established during project bootstrap and must preserve these command names.

## Project Structure

```text
src/
  app/                 Application shell, routing, and module registry
  components/          Shared controls, diagram, timeline, explanation, and question UI
  content/             Study-guide-derived curriculum content and caveats
  simulations/         Foundation simulation contracts and deterministic event engine
  modules/
    database/
      model/            Database-lab domain types and invariants
      simulation/       Database scenario engines and preset scenarios
      DatabaseLab.tsx   Database-lab composition view
      database.test.ts  Database simulation tests
  styles/               Global layout and accessible visual language
tests/                  Shared component and integration tests when they do not belong to a module
```

The study guide remains the curriculum source. Content copied or adapted from it must retain the guide's evidence discipline and explicitly flag illustrative assumptions.

## Interaction Model

Every lab follows the same user-visible loop:

1. Select a concept or scenario.
2. Adjust exposed parameters or inject a named failure.
3. Run or replay the deterministic scenario.
4. Inspect the architecture diagram and chronological event timeline.
5. Read the explanation of mechanism, trade-off, and failure mode.
6. Answer an architecture decision question when the scenario provides one.
7. Reset or compare the current run with another run.

The first database lab must expose controls for at least node count, dataset size, shard-key/distribution mode, replica count or lag, failure injection, query shape, and index selection. Controls may be grouped by scenario so the UI stays understandable.

## Database Simulation Contract

Simulation execution is a pure function of:

- A named scenario.
- A typed parameter state.
- A numeric seed.

The result contains:

- Final topology and record allocation.
- Ordered events with timestamps or logical sequence numbers.
- Derived observations such as load distribution, stale-read possibility, unavailable nodes, fan-out count, and selected query plan.
- Explicit labels identifying simulated observations.
- Explanation entries tied to the events or derived observations.
- Decision questions and expected reasoning points, not hidden grading claims.

For the database module, running the same scenario with the same seed and parameters must produce structurally equivalent results. No wall-clock time, random global state, network request, or environment-dependent measurement may affect that simulation.

### Domain distinctions

The database model must keep these entities distinct:

- **Logical database:** A named logical collection of data and database objects, potentially distributed across multiple shards and instances. Consistency and transaction guarantees are defined separately.
- **Logical partition:** A logical subset of records within the database, defined by a partitioning strategy.
- **Physical shard:** A unit of data ownership and placement containing one or more logical partitions, hosted by one or more database instances. A routing mechanism maps requests to the appropriate shard.
- **Database instance:** A process or storage endpoint that serves database operations for a shard or replica.
- **Compute node:** The infrastructure host that runs one or more database instances.
- **Replica:** A copy of a database instance's data that advances by applying committed operation versions.

Partitioning, sharding, and replication are composable model dimensions. A scenario may simplify their presentation, but it must not collapse these entities into a single "node" concept.

### Explicit mechanism semantics

- **Replica lag:** Represent lag as the difference between a primary's committed operation version and a replica's applied operation version. Do not model lag as fabricated wall-clock milliseconds.
- **Node failure:** A failed compute node and its database instances cannot serve successful requests. Recovery and failover emit explicit ordered events, and failover only routes to an available eligible replica.
- **Cross-shard fan-out:** The set of contacted shards is derived from the query predicate and the shard-ownership function. A targeted predicate may contact one shard; an unbounded or non-shard-key predicate may contact all owned shards.
- **Index behavior:** Use a documented simplified cost model for the teaching simulation (for example, scan cost proportional to records examined versus indexed lookup cost proportional to a bounded lookup term). Do not claim to reproduce PostgreSQL, MongoDB, or another production query planner.

### Simulation lifecycle

The UI and foundation contracts must distinguish:

- **Reset:** Restore scenario defaults and clear the active run.
- **Run:** Execute the current scenario, parameters, and seed.
- **Replay:** Re-display an existing immutable event sequence without re-running or mutating it.
- **Compare:** Show two immutable results and explain meaningful differences.

Event sequence ordering must be stable and reproducible across application sessions.

## Code Style

Use small pure functions for domain behavior and typed discriminated unions for scenario events. React components own presentation and user interaction, not allocation or failure rules.

```ts
export type SimulationEvent =
  | {
      kind: "write-routed";
      sequence: number;
      targetNodeId: string;
      simulated: true;
      explanation: string;
    }
  | {
      kind: "replica-stale";
      sequence: number;
      lagOperations: number;
      simulated: true;
      explanation: string;
    };

export function runDatabaseScenario(
  input: DatabaseScenarioInput,
): DatabaseScenarioResult {
  // Pure, deterministic transformation; no browser or network access.
}
```

Conventions:

- Use `PascalCase` for React components and `camelCase` for functions/variables.
- Use explicit domain names (`replicationLagOperations`, not `lag`).
- Prefer discriminated unions over optional fields with ambiguous meaning.
- Keep explanatory text close to the domain result it explains.
- Avoid comments that merely restate code; comment only on non-obvious teaching or modeling choices.

## Testing Strategy

Use Vitest for pure simulation tests and Testing Library for interaction tests.

Required first-module coverage:

- Determinism for identical seed and inputs.
- Record conservation across shards and replicas.
- Correct distinction between logical databases, logical partitions, physical shards, database instances, compute nodes, and replicas.
- Composable partitioning, sharding, and replication behavior.
- Even versus hot shard allocation behavior.
- Replica applied-version monotonicity and stale-read explanation behavior.
- No successful operations against unavailable nodes.
- Node failure, recovery, and failover event ordering.
- Shard ownership and predicate-derived cross-shard query fan-out.
- Cross-shard transaction limitation explanation.
- Index selection/query-plan changes using the documented simplified cost model.
- Reset/replay behavior at the component level.
- Immutable comparison behavior and meaningful difference explanations.
- The UI visibly labels simulated outcomes and does not claim benchmark measurements.

Tests should assert educational invariants and exact event contracts, not fragile implementation details or invented performance thresholds.

## Boundaries

- **Always:** Keep simulations deterministic; label simulated outcomes; preserve the distinction between teaching models and production measurements; test domain behavior before wiring UI; keep module-specific logic behind typed boundaries; maintain accessible labels and keyboard-operable controls.
- **Ask first:** Adding real database services or cloud dependencies; introducing SQLite-WASM or workers into the database lab; changing the module dependency direction; adding analytics/telemetry; changing the curriculum scope beyond the first database module.
- **Never:** Claim simulated values are production benchmarks; silently reproduce unsupported study-guide assumptions; add network calls or secrets; remove failing tests to make the suite pass; put simulation logic directly in diagram components.

## Success Criteria

The first implementation is complete when:

- A fresh checkout runs locally with the documented commands.
- The app has a navigable Database Architecture Lab.
- The lab renders an architecture diagram, controls, timeline, explanation panel, and scenario decision question.
- Users can change parameters, inject failures, run, replay, reset, and compare at least two deterministic database scenarios.
- The six database concepts listed above are represented by explicit scenarios or controls.
- Identical inputs and seed produce identical simulation results.
- The UI clearly marks simulated outcomes and avoids production-performance claims.
- Automated tests cover the simulation invariants and the critical UI interactions.

## Assumptions

1. The workspace is a new local Vite application; no existing product architecture must be preserved.
2. The first release is desktop-first but should remain usable at narrower viewport widths.
3. Persistence is not required for the first slice; scenario state can be held in memory.
4. Scenario comparison means comparing two local runs in the current browser session, not historical storage.
5. The first database lab uses an illustrative logical model rather than a real database engine or production query planner.
6. Version numbers represent committed/applied logical operations; they are not wall-clock timestamps or latency measurements.
7. The supplied study guide is educational source material, not an authoritative description of any production system.

## Open Questions

- None block the first implementation. The spec assumes an in-memory, deterministic simulation and no persistence; those assumptions should be revisited before adding multi-user or durable progress features.
