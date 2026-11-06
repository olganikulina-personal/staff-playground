# Capability Map: Staff Engineering Architecture Playground

| Module id | Responsibility | Depends on |
|---|---|---|
| `playground-foundation` | App shell, curriculum navigation, shared simulation contracts, deterministic event engine, timeline, explanation panel, scenario comparison primitives | — |
| `database-architecture` | Interactive partitioning, sharding, replication, failures, cross-shard behavior, indexes, and query-plan teaching scenarios | `playground-foundation` |
| `distributed-correctness` | Timeout ambiguity, retries, idempotency, outbox, reconciliation, and delivery-semantics scenarios | `playground-foundation` |
| `react-performance` | Real browser measurements for rendering, workers, memoization, and responsiveness | `playground-foundation` |
| `networking` | Local network-path simulations and proxy/latency/failure experiments | `playground-foundation` |
| `caching-and-messaging` | Cache policies, invalidation, backpressure, queues, and consumer failure scenarios | `playground-foundation` |
| `system-design` | Constraint-driven architecture exercises with explicit assumptions, trade-offs, and capacity models | `playground-foundation` |

Build order: `playground-foundation` → `database-architecture` → `distributed-correctness`, `react-performance`, `networking`, `caching-and-messaging`, `system-design`

The first delivery implements the foundation slice required by the database module and the `database-architecture` module itself. Future modules consume the foundation contracts rather than introducing their own simulation lifecycle.
