# Staff Engineering Architecture Playground Tasks

## Phase 1: Foundation

- [x] Task 1: Bootstrap the Vite application
  - Acceptance: Vite React TypeScript app, strict typing, test setup, required scripts, and disclaimer shell exist.
  - Verify: `npm run build`, `npm run test -- --run`, `npm run lint`.
  - Dependencies: None
  - Files: `package.json`, `vite.config.ts`, `vitest.config.ts`, `src/main.tsx`, `src/styles/global.css`

- [x] Task 2: Define foundation presentation and lifecycle contracts
  - Acceptance: Scenario identity/validation, typed events/results, distinct reset/run/replay/compare lifecycle contracts, and immutable replay/compare utilities exist without database-specific execution.
  - Verify: Focused foundation unit tests and `npm run build`.
  - Dependencies: Task 1
  - Files: `src/simulations/*`

## Checkpoint: Foundation

- [x] Tests pass, build succeeds, and shared contracts remain database-agnostic.

## Phase 2: Database simulation

- [x] Task 3: Model database topology and allocation
  - Acceptance: Logical database/partition, physical shard, database instance, compute node, and replica remain distinct; every logical record maps to exactly one primary shard, while replicas add physical copies only and tests cover even/hot behavior.
  - Verify: Focused allocation tests and `npm run test -- --run`.
  - Dependencies: Task 2
  - Files: `src/modules/database/model/*`, `src/modules/database/simulation/allocation*`

- [x] Task 4: Implement failure, replica, query, and index scenarios
  - Acceptance: All six required database concepts have deterministic event sequences and explanations, including version-based lag, unavailable-node rejection, predicate-derived fan-out, and simplified index cost behavior.
  - Verify: Scenario tests, event-order assertions, and `npm run test -- --run`.
  - Dependencies: Task 3
  - Files: `src/modules/database/simulation/scenarios*`, `src/modules/database/content.ts`, `src/modules/database/index.ts`

## Phase 3: Database lab vertical slice

- [x] Task 5: Build shared lab presentation components
  - Acceptance: Accessible controls, timeline, explanation, decision, and comparison panels render foundation results.
  - Verify: Component tests and `npm run test -- --run`.
  - Dependencies: Task 2
  - Files: `src/components/*`

- [x] Task 6: Render the database architecture lab
  - Acceptance: React Flow diagram, predict/modify/run/observe/explain/compare flow, six concepts, distinct run/replay/reset/compare actions, and simulation labeling work.
  - Verify: Integration test, `npm run build`, `npm run test -- --run`, manual keyboard check.
  - Dependencies: Tasks 4 and 5
  - Files: `src/modules/database/DatabaseLab.tsx`, `src/components/ArchitectureDiagram.tsx`, `src/app/App.tsx`, `src/styles/global.css`

## Checkpoint: Core module

- [x] Database lab runs, replays, resets, compares, and communicates simulation boundaries.

## Phase 4: Polish

- [x] Task 7: Add curriculum caveats and accessibility polish
  - Acceptance: Simplified models are caveated and primary interactions are keyboard accessible.
  - Verify: Full test suite, build, and manual keyboard pass.
  - Dependencies: Task 6
  - Files: database content, shared components, and global styles

## Checkpoint: Complete

- [x] All `SPEC.md` success criteria are satisfied.

---

## Phase 5: Distributed correctness engine

- [x] Task 8: Define domain contracts and timeout/retry scenarios
  - Acceptance: Client/server outcome distinction, unknown timeout state, bounded retries, deterministic events, and deterministic replay inputs.
  - Verify: Focused timeout/retry tests and `npm run test -- --run`.
  - Dependencies: Existing foundation and database module
  - Files: `src/modules/distributed-correctness/model/*`, `simulation/timeout*`, `index.ts`

- [x] Task 9: Add idempotency and transactional outbox scenarios
  - Acceptance: Duplicate effects, stable idempotency suppression, atomic outbox commit, retry delivery, and duplicate-safe consumption.
  - Verify: Focused idempotency/outbox tests and `npm run test -- --run`.
  - Dependencies: Task 8
  - Files: distributed model, idempotency/outbox simulations and tests

- [x] Task 10: Add reconciliation and delivery-semantics scenarios
  - Acceptance: Mismatch classification, deterministic repairs, delivery loss/duplicate trade-offs, and effectively-once caveats.
  - Verify: Distributed scenario tests and `npm run test -- --run`.
  - Dependencies: Task 9
  - Files: reconciliation/delivery simulations and tests

## Checkpoint: Distributed engine

- [x] Distributed scenario tests pass and preserve client/server/effect distinctions.
- [x] Existing database tests remain green.
- [x] No exactly-once transport or production reliability claims are introduced.

## Phase 6: Distributed correctness vertical slice

- [x] Task 11: Create module content, parameter adapter, and lab runner
  - Acceptance: Six scenario families, typed controls, observations, caveats, and decision questions are exposed through the shared presentation contract.
  - Verify: Adapter/content tests and `npm run test -- --run`.
  - Dependencies: Tasks 8-10
  - Files: distributed content, controls, runner, and tests

- [x] Task 12: Compose the Distributed Correctness Lab UI
  - Acceptance: Predict/run/replay/reset/compare flow, scenario switching, client/server outcome presentation, and accessible simulated-result labeling work.
  - Verify: Integration tests, `npm run test -- --run`, and `npm run build`.
  - Dependencies: Task 11
  - Files: lab component/test, `src/app/App.tsx`, `src/styles/global.css`

## Phase 7: Polish and verification

- [x] Task 13: Add module navigation, caveats, accessibility, and browser checks
  - Acceptance: Both labs remain reachable; keyboard, responsive, caveat, and console checks pass.
  - Verify: Full test/build/lint suite and browser checks at desktop and 375px.
  - Dependencies: Task 12
  - Files: app shell, navigation component/test, global styles

## Checkpoint: Distributed Correctness complete

- [x] All `SPEC-distributed-correctness.md` success criteria are satisfied.
- [x] Existing database behavior remains green.
- [x] Full test, build, lint, and browser checks pass.

## Phase 8: React Performance measurement foundation

- [x] Task 14: Define measurement contracts and bounded workloads
  - Acceptance: Type-safe metric evidence, bounded workload validation, isolated measurement buffers, and browser/benchmark caveats.
  - Verify: Focused measurement tests and `npm run lint`.
  - Dependencies: Existing foundation and completed modules
  - Files: React Performance model and measurement foundation

- [x] Task 15: Implement render and derived-computation measurement slices
  - Acceptance: Render invocations, commits, Strict Mode configuration, prop-identity variants, and memoized computation are measured distinctly.
  - Verify: Focused tests and `npm run build`.
  - Dependencies: Task 14
  - Files: Render/computation measurement helpers and tests

- [x] Task 16: Implement worker and responsiveness measurement slices
  - Acceptance: Equivalent worker/main-thread workloads, cleanup, distinct responsiveness metrics, and explicit unsupported states.
  - Verify: Focused tests and `npm run lint`.
  - Dependencies: Task 14
  - Files: Worker/responsiveness helpers and tests

## Checkpoint: Measurement foundation

- [x] Tasks 14-16 are complete.
- [x] No timing values are fabricated.
- [x] Existing tests, build, and lint remain green.

## Phase 9: React Performance vertical slice

- [x] Task 17: Add module content, controls, and lab runner
  - Acceptance: Four selectable scenarios, typed controls, evidence labels, caveats, explanations, and trade-off questions.
  - Verify: Adapter tests and `npm run build`.
  - Dependencies: Tasks 15-16
  - Files: Content, controls, runner, and tests

- [x] Task 18: Compose the React Performance Lab UI and module integration
  - Acceptance: Measurement presentation, immutable run/replay/compare/reset behavior, and navigation integration without regressions.
  - Verify: Integration tests, full tests, and `npm run build`.
  - Dependencies: Task 17
  - Files: Lab component/test, index, app shell, styles

## Checkpoint: React Performance vertical slice

- [x] Tasks 17-18 are complete.
- [x] Module navigation reaches the new lab.
- [x] Existing module behavior remains green.

## Phase 10: Browser verification and completion

- [x] Task 19: Verify real-browser measurements and responsive UX
  - Acceptance: Four scenarios, genuine interactions, metric distinctions, cleanup, clean console, and desktop/375px layout checks pass.
  - Verify: Full test/build/lint suite and browser verification.
  - Dependencies: Task 18
  - Files: Specification and completion checklists

## Checkpoint: React Performance complete

- [x] All `SPEC-react-performance.md` success criteria are satisfied.
- [x] Existing database and distributed-correctness behavior remains green.
- [x] Full test, build, lint, and browser checks pass.
