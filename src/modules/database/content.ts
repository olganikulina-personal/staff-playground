export const DATABASE_LAB_CAVEATS = {
  partitioning:
    "This lab uses logical partitions to make ownership visible; production systems may partition data differently.",
  replication:
    "Replica lag is represented with applied operation versions, not wall-clock latency or a production SLO.",
  failure:
    "Failover eligibility is simplified to same-shard replicas on an available compute node.",
  queries:
    "Fan-out is derived from the modeled shard-key ownership function; real routers may use different metadata and routing paths.",
  indexes:
    "Query-plan costs are illustrative units and do not reproduce a PostgreSQL, MongoDB, or other production planner.",
} as const;

export const DATABASE_DECISION_QUESTIONS = {
  hotPartition:
    "Would you change the shard key, add a write-distribution strategy, or accept the hotspot? Explain which invariant and failure mode drives your choice.",
  replicaLag:
    "Which reads can tolerate an older applied operation version, and which reads must use a current primary or an explicit freshness check?",
  nodeFailure:
    "Would you prefer failover to a replica or recovery of the original instance? Explain the availability and consistency trade-off.",
  crossShard:
    "What would you change if this query became latency-sensitive but still lacked a shard-key predicate?",
  indexPlan:
    "At what selectivity or write cost would you stop adding an index and choose a different access pattern?",
} as const;
