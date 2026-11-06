import { describe, expect, it } from "vitest";

import {
  createDatabaseTopology,
  getAllocationSummary,
} from "./allocation";
import type { DatabaseTopologyInput } from "../model/types";

const evenInput: DatabaseTopologyInput = {
  databaseId: "catalog",
  recordCount: 12,
  logicalPartitionCount: 4,
  shardCount: 2,
  replicaCount: 2,
  computeNodeCount: 3,
  distribution: "even",
  seed: 11,
};

describe("database topology allocation", () => {
  it("keeps database, partitions, shards, instances, nodes, and replicas distinct", () => {
    const result = createDatabaseTopology(evenInput);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { topology } = result;

    expect(topology.logicalDatabase.id).toBe("catalog");
    expect(topology.logicalPartitions).toHaveLength(4);
    expect(topology.physicalShards).toHaveLength(2);
    expect(topology.computeNodes).toHaveLength(3);
    expect(topology.databaseInstances).toHaveLength(6);
    expect(topology.replicas).toHaveLength(4);

    for (const shard of topology.physicalShards) {
      expect(shard.primaryInstanceId).toBeTruthy();
      expect(shard.logicalPartitionIds.length).toBeGreaterThan(0);
    }

    for (const replica of topology.replicas) {
      expect(replica.primaryInstanceId).not.toBe(replica.databaseInstanceId);
      expect(replica.recordIds.length).toBeGreaterThan(0);
    }
  });

  it("conserves logical records while replication adds only physical copies", () => {
    const result = createDatabaseTopology(evenInput);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const summary = getAllocationSummary(result.topology);

    expect(summary.uniqueLogicalRecords).toBe(12);
    expect(summary.primaryRecordCopies).toBe(12);
    expect(summary.physicalRecordCopies).toBe(36);
    expect(
      Object.values(summary.primaryRecordCountByShard).reduce(
        (total, count) => total + count,
        0,
      ),
    ).toBe(summary.uniqueLogicalRecords);
  });

  it("makes hot-key distribution visibly uneven without losing ownership", () => {
    const result = createDatabaseTopology({
      ...evenInput,
      distribution: "hot",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const counts = Object.values(
      getAllocationSummary(result.topology).primaryRecordCountByShard,
    );

    expect(Math.max(...counts)).toBeGreaterThan(Math.min(...counts));
    expect(
      new Set(result.topology.records.map((record) => record.primaryShardId)).size,
    ).toBe(2);
  });

  it("rejects invalid topology parameters instead of silently coercing them", () => {
    const result = createDatabaseTopology({
      ...evenInput,
      shardCount: 0,
      computeNodeCount: 0,
    });

    expect(result).toEqual({
      ok: false,
      errors: [
        "shardCount must be at least 1",
        "computeNodeCount must be at least 1",
      ],
    });
  });

  it("is reproducible for identical inputs and seeds", () => {
    const first = createDatabaseTopology(evenInput);
    const second = createDatabaseTopology(evenInput);

    expect(second).toEqual(first);
  });
});
