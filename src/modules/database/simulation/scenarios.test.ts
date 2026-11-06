import { describe, expect, it } from "vitest";

import { createDatabaseTopology } from "./allocation";
import {
  advanceReplicaVersion,
  simulateCrossShardQuery,
  simulateIndexPlan,
  simulateNodeFailure,
  simulateReplicaRead,
} from "./scenarios";
import type { DatabaseTopologyInput } from "../model/types";

const topologyInput: DatabaseTopologyInput = {
  databaseId: "catalog",
  recordCount: 12,
  logicalPartitionCount: 4,
  shardCount: 2,
  replicaCount: 1,
  computeNodeCount: 3,
  distribution: "even",
  seed: 11,
};

function createTopology() {
  const result = createDatabaseTopology(topologyInput);

  if (!result.ok) {
    throw new Error(result.errors.join(", "));
  }

  return result.topology;
}

describe("replication-version scenarios", () => {
  it("reports replica lag as an operation-version difference", () => {
    const result = simulateReplicaRead({
      primaryCommittedVersion: 12,
      replicaAppliedVersion: 9,
      readFrom: "replica",
    });

    expect(result.lagOperations).toBe(3);
    expect(result.staleReadPossible).toBe(true);
    expect(result.observedVersion).toBe(9);
    expect(result.events.map((event) => event.kind)).toEqual([
      "primary-version-observed",
      "replica-read",
      "replica-stale",
    ]);
    expect("lagMilliseconds" in result).toBe(false);
  });

  it("never decreases an applied replica version", () => {
    expect(
      advanceReplicaVersion({
        currentAppliedVersion: 9,
        requestedVersion: 7,
      }),
    ).toEqual({
      appliedVersion: 9,
      advanced: false,
    });

    expect(
      advanceReplicaVersion({
        currentAppliedVersion: 9,
        requestedVersion: 12,
      }),
    ).toEqual({
      appliedVersion: 12,
      advanced: true,
    });
  });
});

describe("node failure scenarios", () => {
  it("rejects a request targeting an instance on a failed node", () => {
    const result = simulateNodeFailure({
      topology: createTopology(),
      failedComputeNodeId: "compute-node-1",
      requestInstanceId: "shard-1-primary",
      recoverNode: false,
    });

    expect(result.requestSucceeded).toBe(false);
    expect(result.servedByInstanceId).toBeUndefined();
    expect(result.events.map((event) => event.kind)).toEqual([
      "node-failed",
      "request-rejected-unavailable",
    ]);
  });

  it("fails over to an available replica and never serves through the failed node", () => {
    const result = simulateNodeFailure({
      topology: createTopology(),
      failedComputeNodeId: "compute-node-1",
      requestInstanceId: "shard-1-primary",
      failoverInstanceId: "shard-1-replica-1",
      recoverNode: false,
    });

    expect(result.requestSucceeded).toBe(true);
    expect(result.servedByInstanceId).toBe("shard-1-replica-1");
    expect(result.events.map((event) => event.kind)).toEqual([
      "node-failed",
      "failover-routed",
      "request-served",
    ]);
  });

  it("recovers the failed node before serving a retried request", () => {
    const result = simulateNodeFailure({
      topology: createTopology(),
      failedComputeNodeId: "compute-node-1",
      requestInstanceId: "shard-1-primary",
      recoverNode: true,
    });

    expect(result.requestSucceeded).toBe(true);
    expect(result.servedByInstanceId).toBe("shard-1-primary");
    expect(result.events.map((event) => event.kind)).toEqual([
      "node-failed",
      "request-rejected-unavailable",
      "node-recovered",
      "request-served",
    ]);
  });
});

describe("query routing and index-plan scenarios", () => {
  it("routes an exact shard-key predicate to the owning shard", () => {
    const topology = createTopology();
    const record = topology.records[0];
    const result = simulateCrossShardQuery({
      topology,
      predicate: {
        kind: "shard-key-equals",
        value: record.shardKey,
      },
    });

    expect(result.contactedShardIds).toEqual([record.primaryShardId]);
    expect(result.fanOutCount).toBe(1);
    expect(result.transactionSemantics).toBe("single-shard");
    expect(result.events.map((event) => event.kind)).toEqual([
      "predicate-evaluated",
      "single-shard-target",
      "query-served",
    ]);
  });

  it("fans out non-shard-key predicates to every owned shard", () => {
    const topology = createTopology();
    const result = simulateCrossShardQuery({
      topology,
      predicate: {
        kind: "field-equals",
        field: "category",
        value: "outerwear",
      },
    });

    expect(result.contactedShardIds).toEqual(["shard-1", "shard-2"]);
    expect(result.fanOutCount).toBe(2);
    expect(result.transactionSemantics).toBe(
      "distributed-coordination-required",
    );
    expect(result.events.map((event) => event.kind)).toEqual([
      "predicate-evaluated",
      "cross-shard-fanout",
      "query-served",
    ]);
  });

  it("uses the documented simplified index cost model", () => {
    const indexed = simulateIndexPlan({
      recordCount: 1000,
      matchingRecordCount: 10,
      indexPresent: true,
    });
    const unindexed = simulateIndexPlan({
      recordCount: 1000,
      matchingRecordCount: 10,
      indexPresent: false,
    });

    expect(indexed.selectedPlan).toBe("index-lookup");
    expect(indexed.estimatedCostUnits).toBeLessThan(indexed.scanCostUnits);
    expect(unindexed.selectedPlan).toBe("full-scan");
    expect(unindexed.estimatedCostUnits).toBe(unindexed.scanCostUnits);
    expect(indexed.costModel).toMatch(/illustrative/i);
  });

  it("does not use an index when the simplified lookup cost exceeds a scan", () => {
    const result = simulateIndexPlan({
      recordCount: 100,
      matchingRecordCount: 99,
      indexPresent: true,
    });

    expect(result.selectedPlan).toBe("full-scan");
    expect(result.events.map((event) => event.kind)).toEqual([
      "query-shape-evaluated",
      "full-scan-selected",
    ]);
  });
});
