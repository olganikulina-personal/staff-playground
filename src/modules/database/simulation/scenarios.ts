import type {
  DatabaseInstance,
  DatabaseTopology,
} from "../model/types";
import type { Explanation, TimelineEvent } from "../../../simulations/types";

export interface ReplicaReadInput {
  readonly primaryCommittedVersion: number;
  readonly replicaAppliedVersion: number;
  readonly readFrom: "primary" | "replica";
}

export interface ReplicaReadResult {
  readonly lagOperations: number;
  readonly staleReadPossible: boolean;
  readonly observedVersion: number;
  readonly events: readonly TimelineEvent[];
  readonly explanations: readonly Explanation[];
}

export interface ReplicaVersionAdvanceInput {
  readonly currentAppliedVersion: number;
  readonly requestedVersion: number;
}

export interface ReplicaVersionAdvanceResult {
  readonly appliedVersion: number;
  readonly advanced: boolean;
}

export interface NodeFailureInput {
  readonly topology: DatabaseTopology;
  readonly failedComputeNodeId: string;
  readonly requestInstanceId: string;
  readonly failoverInstanceId?: string;
  readonly recoverNode: boolean;
}

export interface NodeFailureResult {
  readonly failedComputeNodeId: string;
  readonly requestSucceeded: boolean;
  readonly servedByInstanceId?: string;
  readonly events: readonly TimelineEvent[];
  readonly explanations: readonly Explanation[];
}

export type QueryPredicate =
  | {
      readonly kind: "shard-key-equals";
      readonly value: string;
    }
  | {
      readonly kind: "field-equals";
      readonly field: string;
      readonly value: string;
    }
  | {
      readonly kind: "unbounded";
    };

export interface CrossShardQueryInput {
  readonly topology: DatabaseTopology;
  readonly predicate: QueryPredicate;
}

export interface CrossShardQueryResult {
  readonly contactedShardIds: readonly string[];
  readonly fanOutCount: number;
  readonly transactionSemantics:
    | "single-shard"
    | "distributed-coordination-required";
  readonly events: readonly TimelineEvent[];
  readonly explanations: readonly Explanation[];
}

export interface IndexPlanInput {
  readonly recordCount: number;
  readonly matchingRecordCount: number;
  readonly indexPresent: boolean;
}

export interface IndexPlanResult {
  readonly selectedPlan: "index-lookup" | "full-scan";
  readonly scanCostUnits: number;
  readonly indexLookupCostUnits: number;
  readonly estimatedCostUnits: number;
  readonly costModel: string;
  readonly events: readonly TimelineEvent[];
  readonly explanations: readonly Explanation[];
}

export function simulateReplicaRead(
  input: ReplicaReadInput,
): ReplicaReadResult {
  if (
    !Number.isInteger(input.primaryCommittedVersion) ||
    input.primaryCommittedVersion < 0 ||
    !Number.isInteger(input.replicaAppliedVersion) ||
    input.replicaAppliedVersion < 0 ||
    input.replicaAppliedVersion > input.primaryCommittedVersion
  ) {
    throw new RangeError(
      "Replica applied version must be an integer between zero and the primary committed version",
    );
  }

  const lagOperations =
    input.primaryCommittedVersion - input.replicaAppliedVersion;
  const staleReadPossible =
    input.readFrom === "replica" && lagOperations > 0;
  const events: TimelineEvent[] = [
    makeEvent(
      1,
      "primary-version-observed",
      "Primary version observed",
      `The primary has committed operation version ${input.primaryCommittedVersion}.`,
    ),
    makeEvent(
      2,
      "replica-read",
      `${input.readFrom === "replica" ? "Replica" : "Primary"} read`,
      `The read observed operation version ${
        input.readFrom === "replica"
          ? input.replicaAppliedVersion
          : input.primaryCommittedVersion
      }.`,
    ),
  ];

  if (staleReadPossible) {
    events.push(
      makeEvent(
        3,
        "replica-stale",
        "Replica may be stale",
        `The replica is ${lagOperations} operation versions behind the primary.`,
      ),
    );
  }

  return {
    lagOperations,
    staleReadPossible,
    observedVersion:
      input.readFrom === "replica"
        ? input.replicaAppliedVersion
        : input.primaryCommittedVersion,
    events,
    explanations: [
      {
        title: "Version-based replication lag",
        mechanism:
          "A replica is current only through its applied operation version.",
        tradeoff:
          "Replica reads can distribute load while allowing older committed state.",
        failureMode:
          "A read that requires the latest version must not assume a lagging replica is current.",
        eventSequences: staleReadPossible ? [1, 2, 3] : [1, 2],
      },
    ],
  };
}

export function advanceReplicaVersion(
  input: ReplicaVersionAdvanceInput,
): ReplicaVersionAdvanceResult {
  if (
    !Number.isInteger(input.currentAppliedVersion) ||
    !Number.isInteger(input.requestedVersion) ||
    input.currentAppliedVersion < 0 ||
    input.requestedVersion < 0
  ) {
    throw new RangeError("Replica versions must be non-negative integers");
  }

  const appliedVersion = Math.max(
    input.currentAppliedVersion,
    input.requestedVersion,
  );
  return {
    appliedVersion,
    advanced: appliedVersion > input.currentAppliedVersion,
  };
}

export function simulateNodeFailure(
  input: NodeFailureInput,
): NodeFailureResult {
  const failedNode = input.topology.computeNodes.find(
    (node) => node.id === input.failedComputeNodeId,
  );
  const requestInstance = findInstance(
    input.topology.databaseInstances,
    input.requestInstanceId,
  );
  const events: TimelineEvent[] = [
    makeEvent(
      1,
      "node-failed",
      "Compute node failed",
      `Requests cannot be served by instances hosted on ${input.failedComputeNodeId}.`,
    ),
  ];

  if (!failedNode) {
    throw new Error(`Unknown compute node: ${input.failedComputeNodeId}`);
  }

  const requestOnFailedNode =
    requestInstance.computeNodeId === input.failedComputeNodeId;
  if (!requestOnFailedNode) {
    events.push(
      makeEvent(
        2,
        "request-served",
        "Request served",
        `The target instance remains available on ${requestInstance.computeNodeId}.`,
      ),
    );
    if (input.recoverNode) {
      events.push(
        makeEvent(
          events.length + 1,
          "node-recovered",
          "Compute node recovered",
          `The failed node ${input.failedComputeNodeId} is available again.`,
        ),
      );
    }
    return createNodeFailureResult(input, events, requestInstance.id);
  }

  const failoverInstance = input.failoverInstanceId
    ? findInstance(
        input.topology.databaseInstances,
        input.failoverInstanceId,
      )
    : undefined;
  const eligibleFailover =
    failoverInstance &&
    failoverInstance.role === "replica" &&
    failoverInstance.physicalShardId === requestInstance.physicalShardId &&
    failoverInstance.computeNodeId !== input.failedComputeNodeId
      ? failoverInstance
      : undefined;

  if (eligibleFailover) {
    events.push(
      makeEvent(
        2,
        "failover-routed",
        "Failover routed request",
        `The request moved to replica ${eligibleFailover.id} on an available node.`,
      ),
      makeEvent(
        3,
        "request-served",
        "Request served",
        `The request completed on ${eligibleFailover.id}.`,
      ),
    );
    return createNodeFailureResult(input, events, eligibleFailover.id);
  }

  events.push(
    makeEvent(
      2,
      "request-rejected-unavailable",
      "Request rejected",
      `The target instance ${requestInstance.id} is unavailable with no eligible failover.`,
    ),
  );

  if (!input.recoverNode) {
    return createNodeFailureResult(input, events);
  }

  events.push(
    makeEvent(
      3,
      "node-recovered",
      "Compute node recovered",
      `The failed node ${input.failedComputeNodeId} is available again.`,
    ),
    makeEvent(
      4,
      "request-served",
      "Request served after recovery",
      `The retried request completed on ${requestInstance.id}.`,
    ),
  );
  return createNodeFailureResult(input, events, requestInstance.id);
}

export function simulateCrossShardQuery(
  input: CrossShardQueryInput,
): CrossShardQueryResult {
  const allShardIds = input.topology.physicalShards.map((shard) => shard.id);
  const targetShardIds =
    input.predicate.kind === "shard-key-equals"
      ? getShardIdsForKey(input.topology, input.predicate.value)
      : allShardIds;
  const contactedShardIds = allShardIds.filter((shardId) =>
    targetShardIds.includes(shardId),
  );
  const fanOutCount = contactedShardIds.length;
  const transactionSemantics =
    fanOutCount === 1
      ? "single-shard"
      : "distributed-coordination-required";
  const fanOutEvent =
    fanOutCount === 1
      ? makeEvent(
          2,
          "single-shard-target",
          "Single-shard target",
          `The predicate identifies ${contactedShardIds[0]}.`,
        )
      : makeEvent(
          2,
          "cross-shard-fanout",
          "Cross-shard fan-out",
          `The predicate requires contacting ${fanOutCount} owned shards.`,
        );

  return {
    contactedShardIds,
    fanOutCount,
    transactionSemantics,
    events: [
      makeEvent(
        1,
        "predicate-evaluated",
        "Predicate evaluated",
        describePredicate(input.predicate),
      ),
      fanOutEvent,
      makeEvent(
        3,
        "query-served",
        "Query served",
        `The query was evaluated across ${fanOutCount} shard${
          fanOutCount === 1 ? "" : "s"
        }.`,
      ),
    ],
    explanations: [
      {
        title: "Shard ownership determines fan-out",
        mechanism:
          "A query can target one shard only when its predicate identifies an owned shard key.",
        tradeoff:
          "Fan-out preserves query flexibility but adds coordination and response aggregation.",
        failureMode:
          "A cross-shard transaction needs distributed coordination rather than a single-shard commit.",
        eventSequences: [1, 2, 3],
      },
    ],
  };
}

export function simulateIndexPlan(input: IndexPlanInput): IndexPlanResult {
  if (
    !Number.isInteger(input.recordCount) ||
    input.recordCount < 1 ||
    !Number.isInteger(input.matchingRecordCount) ||
    input.matchingRecordCount < 0 ||
    input.matchingRecordCount > input.recordCount
  ) {
    throw new RangeError(
      "Index-plan counts must be integers with matches between zero and recordCount",
    );
  }

  const scanCostUnits = input.recordCount;
  const indexLookupCostUnits =
    Math.ceil(Math.log2(input.recordCount + 1)) + input.matchingRecordCount;
  const selectedPlan =
    input.indexPresent && indexLookupCostUnits < scanCostUnits
      ? "index-lookup"
      : "full-scan";
  const estimatedCostUnits =
    selectedPlan === "index-lookup"
      ? indexLookupCostUnits
      : scanCostUnits;
  const costModel =
    "Illustrative units only: full scan cost equals records examined; index lookup cost equals ceil(log2(recordCount + 1)) plus matching records.";
  const planEvent =
    selectedPlan === "index-lookup"
      ? makeEvent(
          2,
          "index-selected",
          "Index lookup selected",
          `The simplified index cost (${indexLookupCostUnits}) is below the scan cost (${scanCostUnits}).`,
        )
      : makeEvent(
          2,
          "full-scan-selected",
          "Full scan selected",
          `The simplified scan cost (${scanCostUnits}) is no greater than the available index path.`,
        );

  return {
    selectedPlan,
    scanCostUnits,
    indexLookupCostUnits,
    estimatedCostUnits,
    costModel,
    events: [
      makeEvent(
        1,
        "query-shape-evaluated",
        "Query shape evaluated",
        `The model expects ${input.matchingRecordCount} matching records out of ${input.recordCount}.`,
      ),
      planEvent,
    ],
    explanations: [
      {
        title: "Illustrative query-plan cost",
        mechanism:
          "The teaching model compares records examined with a logarithmic lookup term plus matched records.",
        tradeoff:
          "Indexes can reduce examined records but have maintenance and selectivity trade-offs.",
        failureMode:
          "This simplified result is not a claim about a PostgreSQL, MongoDB, or other production planner.",
        eventSequences: [1, 2],
      },
    ],
  };
}

function createNodeFailureResult(
  input: NodeFailureInput,
  events: readonly TimelineEvent[],
  servedByInstanceId?: string,
): NodeFailureResult {
  return {
    failedComputeNodeId: input.failedComputeNodeId,
    requestSucceeded: servedByInstanceId !== undefined,
    servedByInstanceId,
    events,
    explanations: [
      {
        title: "Availability follows the hosting node",
        mechanism:
          "A database instance cannot serve while its compute node is failed.",
        tradeoff:
          "Failover can preserve availability when an eligible replica is ready.",
        failureMode:
          "Routing a request to an unavailable instance is not a successful operation.",
        eventSequences: events.map((event) => event.sequence),
      },
    ],
  };
}

function getShardIdsForKey(
  topology: DatabaseTopology,
  shardKey: string,
): readonly string[] {
  const matchingShardIds = topology.records
    .filter((record) => record.shardKey === shardKey)
    .map((record) => record.primaryShardId);
  if (matchingShardIds.length > 0) {
    return [...new Set(matchingShardIds)];
  }

  const shardIndex = hashString(shardKey) % topology.physicalShards.length;
  return [topology.physicalShards[shardIndex].id];
}

function describePredicate(predicate: QueryPredicate): string {
  switch (predicate.kind) {
    case "shard-key-equals":
      return `The query includes an equality predicate for shard key ${predicate.value}.`;
    case "field-equals":
      return `The query filters ${predicate.field}, which is not the shard key.`;
    case "unbounded":
      return "The query does not constrain a shard key.";
  }
}

function hashString(value: string): number {
  let hash = 0;
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function findInstance(
  instances: readonly DatabaseInstance[],
  instanceId: string,
): DatabaseInstance {
  const instance = instances.find((candidate) => candidate.id === instanceId);
  if (!instance) {
    throw new Error(`Unknown database instance: ${instanceId}`);
  }
  return instance;
}

function makeEvent(
  sequence: number,
  kind: string,
  label: string,
  detail: string,
): TimelineEvent {
  return {
    sequence,
    kind,
    label,
    detail,
    simulated: true,
  };
}
