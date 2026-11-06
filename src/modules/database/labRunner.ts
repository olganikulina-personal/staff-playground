import { getAllocationSummary, createDatabaseTopology } from "./simulation/allocation";
import {
  simulateCrossShardQuery,
  simulateIndexPlan,
  simulateNodeFailure,
  simulateReplicaRead,
} from "./simulation/scenarios";
import { DATABASE_DECISION_QUESTIONS } from "./content";
import type {
  AllocationSummary,
  DatabaseTopology,
  DatabaseTopologyInput,
} from "./model/types";
import type {
  DecisionQuestion,
  Explanation,
  TimelineEvent,
} from "../../simulations/types";

export type DatabaseScenarioId =
  | "allocation"
  | "replication-lag"
  | "node-failure"
  | "cross-shard-query"
  | "index-plan";

export type QueryMode = "shard-key" | "non-shard-key";

export interface DatabaseLabParameters extends DatabaseTopologyInput {
  readonly scenario: DatabaseScenarioId;
  readonly primaryCommittedVersion: number;
  readonly replicaAppliedVersion: number;
  readonly failedComputeNodeId: string;
  readonly recoverNode: boolean;
  readonly failoverEnabled: boolean;
  readonly queryMode: QueryMode;
  readonly indexPresent: boolean;
  readonly matchingRecordCount: number;
}

export interface DatabaseLabResult {
  readonly scenario: DatabaseScenarioId;
  readonly topology: DatabaseTopology;
  readonly summary: AllocationSummary;
  readonly observations: readonly {
    readonly label: string;
    readonly value: string;
  }[];
  readonly events: readonly TimelineEvent[];
  readonly explanations: readonly Explanation[];
  readonly decisionQuestion: DecisionQuestion;
}

export type DatabaseLabRunResult =
  | {
      readonly ok: true;
      readonly result: DatabaseLabResult;
    }
  | {
      readonly ok: false;
      readonly error: string;
    };

export const DEFAULT_DATABASE_PARAMETERS: DatabaseLabParameters = {
  scenario: "allocation",
  databaseId: "catalog",
  recordCount: 120,
  logicalPartitionCount: 6,
  shardCount: 3,
  replicaCount: 1,
  computeNodeCount: 4,
  distribution: "even",
  seed: 11,
  primaryCommittedVersion: 12,
  replicaAppliedVersion: 9,
  failedComputeNodeId: "compute-node-1",
  recoverNode: false,
  failoverEnabled: true,
  queryMode: "shard-key",
  indexPresent: true,
  matchingRecordCount: 10,
};

export function runDatabaseLabScenario(
  parameters: DatabaseLabParameters,
): DatabaseLabRunResult {
  const topologyResult = createDatabaseTopology(parameters);
  if (!topologyResult.ok) {
    return {
      ok: false,
      error: topologyResult.errors.join("; "),
    };
  }

  const topology = topologyResult.topology;
  const summary = getAllocationSummary(topology);
  const scenarioResult = runScenario(parameters, topology, summary);

  return {
    ok: true,
    result: {
      scenario: parameters.scenario,
      topology,
      summary,
      observations: scenarioResult.observations,
      events: scenarioResult.events,
      explanations: scenarioResult.explanations,
      decisionQuestion: scenarioResult.decisionQuestion,
    },
  };
}

function runScenario(
  parameters: DatabaseLabParameters,
  topology: DatabaseTopology,
  summary: AllocationSummary,
): Omit<DatabaseLabResult, "scenario" | "topology" | "summary"> {
  switch (parameters.scenario) {
    case "allocation":
      return {
        observations: [
          {
            label: "Primary records",
            value: String(summary.primaryRecordCopies),
          },
          {
            label: "Physical copies",
            value: String(summary.physicalRecordCopies),
          },
          {
            label: "Distribution",
            value: parameters.distribution === "hot" ? "Hot partition" : "Even",
          },
        ],
        events: [
          event(
            1,
            "topology-created",
            "Topology created",
            `${parameters.logicalPartitionCount} logical partitions map to ${parameters.shardCount} physical shards.`,
          ),
          event(
            2,
            "records-allocated",
            "Primary records allocated",
            `${summary.primaryRecordCopies} logical records are owned by primary shards.`,
          ),
          event(
            3,
            "replicas-copied",
            "Replica copies represented",
            `${summary.physicalRecordCopies} physical copies are represented across primaries and replicas.`,
          ),
        ],
        explanations: [
          {
            title: "Partitioning, sharding, and replication compose",
            mechanism:
              "Logical partitions describe subsets of records, shards own placement, and replicas copy shard data.",
            tradeoff:
              "More replicas can improve read availability while increasing physical storage and coordination work.",
            failureMode:
              "Uneven ownership creates a hot shard even when the total record count is unchanged.",
            eventSequences: [1, 2, 3],
          },
        ],
        decisionQuestion: {
          prompt: DATABASE_DECISION_QUESTIONS.hotPartition,
          options: [
            "Change the shard key",
            "Distribute writes across stripes",
            "Accept the hotspot temporarily",
          ],
          reasoningFocus:
            "Tie the choice to load distribution and the failure domain.",
        },
      };
    case "replication-lag": {
      const replicaResult = simulateReplicaRead({
        primaryCommittedVersion: parameters.primaryCommittedVersion,
        replicaAppliedVersion: parameters.replicaAppliedVersion,
        readFrom: "replica",
      });
      return {
        observations: [
          {
            label: "Committed version",
            value: String(parameters.primaryCommittedVersion),
          },
          {
            label: "Applied replica version",
            value: String(parameters.replicaAppliedVersion),
          },
          {
            label: "Lag",
            value: `${replicaResult.lagOperations} operations`,
          },
        ],
        events: replicaResult.events,
        explanations: replicaResult.explanations,
        decisionQuestion: {
          prompt: DATABASE_DECISION_QUESTIONS.replicaLag,
          options: [
            "Read from the replica",
            "Read from the primary",
            "Add a freshness check",
          ],
          reasoningFocus:
            "Connect read placement to the freshness invariant.",
        },
      };
    }
    case "node-failure": {
      const failureResult = simulateNodeFailure({
        topology,
        failedComputeNodeId: parameters.failedComputeNodeId,
        requestInstanceId: "shard-1-primary",
        failoverInstanceId: parameters.failoverEnabled
          ? "shard-1-replica-1"
          : undefined,
        recoverNode: parameters.recoverNode,
      });
      return {
        observations: [
          {
            label: "Failed node",
            value: failureResult.failedComputeNodeId,
          },
          {
            label: "Request outcome",
            value: failureResult.requestSucceeded ? "Served" : "Rejected",
          },
          {
            label: "Serving instance",
            value: failureResult.servedByInstanceId ?? "None",
          },
        ],
        events: failureResult.events,
        explanations: failureResult.explanations,
        decisionQuestion: {
          prompt: DATABASE_DECISION_QUESTIONS.nodeFailure,
          options: ["Fail over to a replica", "Recover the original node"],
          reasoningFocus:
            "Compare availability, failover eligibility, and recovery ordering.",
        },
      };
    }
    case "cross-shard-query": {
      const queryResult = simulateCrossShardQuery({
        topology,
        predicate:
          parameters.queryMode === "shard-key"
            ? {
                kind: "shard-key-equals",
                value: topology.records[0].shardKey,
              }
            : {
                kind: "field-equals",
                field: "category",
                value: "outerwear",
              },
      });
      return {
        observations: [
          {
            label: "Contacted shards",
            value: queryResult.contactedShardIds.join(", "),
          },
          {
            label: "Fan-out count",
            value: String(queryResult.fanOutCount),
          },
          {
            label: "Transaction model",
            value: queryResult.transactionSemantics,
          },
        ],
        events: queryResult.events,
        explanations: queryResult.explanations,
        decisionQuestion: {
          prompt: DATABASE_DECISION_QUESTIONS.crossShard,
          options: [
            "Require a shard-key predicate",
            "Accept fan-out and aggregate",
            "Move the query to a read model",
          ],
          reasoningFocus:
            "Relate query shape to coordination and latency trade-offs.",
        },
      };
    }
    case "index-plan": {
      const indexResult = simulateIndexPlan({
        recordCount: parameters.recordCount,
        matchingRecordCount: Math.min(
          parameters.matchingRecordCount,
          parameters.recordCount,
        ),
        indexPresent: parameters.indexPresent,
      });
      return {
        observations: [
          {
            label: "Selected plan",
            value: indexResult.selectedPlan,
          },
          {
            label: "Estimated cost",
            value: `${indexResult.estimatedCostUnits} illustrative units`,
          },
          {
            label: "Index present",
            value: parameters.indexPresent ? "Yes" : "No",
          },
        ],
        events: indexResult.events,
        explanations: indexResult.explanations,
        decisionQuestion: {
          prompt: DATABASE_DECISION_QUESTIONS.indexPlan,
          options: [
            "Add the index",
            "Keep the scan",
            "Change the query shape",
          ],
          reasoningFocus:
            "Use selectivity and write-maintenance cost rather than labels alone.",
        },
      };
    }
  }
}

function event(
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
