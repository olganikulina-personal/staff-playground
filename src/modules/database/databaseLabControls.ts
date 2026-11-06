import type { ParameterField } from "../../components/ParameterControls";
import {
  DEFAULT_DATABASE_PARAMETERS,
  type DatabaseLabParameters,
  type DatabaseScenarioId,
} from "./labRunner";

export const DATABASE_SCENARIO_LABELS: Record<DatabaseScenarioId, string> = {
  allocation: "Partitioning, sharding, and replication",
  "replication-lag": "Read replicas and replication lag",
  "node-failure": "Node failure and recovery",
  "cross-shard-query": "Cross-shard queries and transactions",
  "index-plan": "Indexes and query plans",
};

export function createDatabaseParameterFields(
  parameters: DatabaseLabParameters,
): readonly ParameterField[] {
  return [
    {
      id: "scenario",
      label: "Scenario",
      inputType: "select",
      value: parameters.scenario,
      options: Object.entries(DATABASE_SCENARIO_LABELS).map(
        ([value, label]) => ({ value, label }),
      ),
    },
    {
      id: "recordCount",
      label: "Dataset records",
      inputType: "number",
      value: parameters.recordCount,
      min: 1,
      max: 10000,
    },
    {
      id: "logicalPartitionCount",
      label: "Logical partitions",
      inputType: "number",
      value: parameters.logicalPartitionCount,
      min: 1,
      max: 100,
    },
    {
      id: "shardCount",
      label: "Physical shards",
      inputType: "number",
      value: parameters.shardCount,
      min: 1,
      max: 20,
    },
    {
      id: "replicaCount",
      label: "Replicas per shard",
      inputType: "number",
      value: parameters.replicaCount,
      min: 0,
      max: 5,
    },
    {
      id: "computeNodeCount",
      label: "Compute nodes",
      inputType: "number",
      value: parameters.computeNodeCount,
      min: 1,
      max: 20,
    },
    {
      id: "distribution",
      label: "Distribution",
      inputType: "select",
      value: parameters.distribution,
      options: [
        { value: "even", label: "Even distribution" },
        { value: "hot", label: "Hot partition" },
      ],
    },
    {
      id: "seed",
      label: "Deterministic seed",
      inputType: "number",
      value: parameters.seed,
    },
    {
      id: "primaryCommittedVersion",
      label: "Primary committed version",
      inputType: "number",
      value: parameters.primaryCommittedVersion,
      min: 0,
    },
    {
      id: "replicaAppliedVersion",
      label: "Replica applied version",
      inputType: "number",
      value: parameters.replicaAppliedVersion,
      min: 0,
    },
    {
      id: "failedComputeNodeId",
      label: "Failed node",
      inputType: "select",
      value: parameters.failedComputeNodeId,
      options: Array.from(
        { length: parameters.computeNodeCount },
        (_, index) => ({
          value: `compute-node-${index + 1}`,
          label: `compute-node-${index + 1}`,
        }),
      ),
    },
    {
      id: "recoverNode",
      label: "Recover failed node",
      inputType: "select",
      value: String(parameters.recoverNode),
      options: [
        { value: "false", label: "No recovery" },
        { value: "true", label: "Recover and retry" },
      ],
    },
    {
      id: "failoverEnabled",
      label: "Fail over to replica",
      inputType: "select",
      value: String(parameters.failoverEnabled),
      options: [
        { value: "true", label: "Enabled" },
        { value: "false", label: "Disabled" },
      ],
    },
    {
      id: "queryMode",
      label: "Query predicate",
      inputType: "select",
      value: parameters.queryMode,
      options: [
        { value: "shard-key", label: "Shard-key equality" },
        { value: "non-shard-key", label: "Non-shard-key filter" },
      ],
    },
    {
      id: "indexPresent",
      label: "Index present",
      inputType: "select",
      value: String(parameters.indexPresent),
      options: [
        { value: "true", label: "Yes" },
        { value: "false", label: "No" },
      ],
    },
    {
      id: "matchingRecordCount",
      label: "Matching records",
      inputType: "number",
      value: parameters.matchingRecordCount,
      min: 0,
      max: parameters.recordCount,
    },
  ];
}

export function updateDatabaseParameters(
  parameters: DatabaseLabParameters,
  fieldId: string,
  value: string,
): DatabaseLabParameters {
  const numericFields = new Set([
    "recordCount",
    "logicalPartitionCount",
    "shardCount",
    "replicaCount",
    "computeNodeCount",
    "seed",
    "primaryCommittedVersion",
    "replicaAppliedVersion",
    "matchingRecordCount",
  ]);
  if (numericFields.has(fieldId)) {
    return {
      ...parameters,
      [fieldId]: Number(value),
    };
  }

  if (fieldId === "recoverNode" || fieldId === "failoverEnabled") {
    return {
      ...parameters,
      [fieldId]: value === "true",
    };
  }

  if (
    fieldId === "scenario" ||
    fieldId === "distribution" ||
    fieldId === "failedComputeNodeId" ||
    fieldId === "queryMode"
  ) {
    return {
      ...parameters,
      [fieldId]: value,
    };
  }

  return DEFAULT_DATABASE_PARAMETERS;
}
