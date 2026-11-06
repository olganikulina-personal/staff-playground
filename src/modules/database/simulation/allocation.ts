import {
  validateTopologyInput,
} from "../model/validation";
import type {
  AllocationSummary,
  ComputeNode,
  DatabaseInstance,
  DatabaseTopology,
  DatabaseTopologyInput,
  LogicalDatabase,
  LogicalPartition,
  LogicalRecord,
  PhysicalShard,
  Replica,
  TopologyResult,
} from "../model/types";

type MutablePartition = Omit<LogicalPartition, "recordIds"> & {
  recordIds: string[];
};
type MutableShard = Omit<
  PhysicalShard,
  "logicalPartitionIds" | "primaryInstanceId" | "replicaIds" | "primaryRecordIds"
> & {
  primaryInstanceId: string;
  logicalPartitionIds: string[];
  replicaIds: string[];
  primaryRecordIds: string[];
};

export function createDatabaseTopology(
  input: DatabaseTopologyInput,
): TopologyResult {
  const errors = validateTopologyInput(input);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const logicalDatabase: LogicalDatabase = {
    id: input.databaseId,
    name: input.databaseId,
  };
  const computeNodes = createComputeNodes(input.computeNodeCount);
  const physicalShards = createEmptyShards(input);
  const logicalPartitions = createEmptyPartitions(input);
  const records = createRecords(input, logicalPartitions, physicalShards);
  const databaseInstances = createDatabaseInstances(
    input,
    physicalShards,
    computeNodes,
  );
  const replicas = createReplicas(input, physicalShards, databaseInstances);
  const topology: DatabaseTopology = {
    logicalDatabase,
    records,
    logicalPartitions,
    physicalShards,
    computeNodes,
    databaseInstances,
    replicas,
  };

  return { ok: true, topology };
}

export function getAllocationSummary(
  topology: DatabaseTopology,
): AllocationSummary {
  const primaryRecordCountByShard = Object.fromEntries(
    topology.physicalShards.map((shard) => [
      shard.id,
      shard.primaryRecordIds.length,
    ]),
  );
  const primaryRecordCopies = topology.physicalShards.reduce(
    (total, shard) => total + shard.primaryRecordIds.length,
    0,
  );
  const replicaRecordCopies = topology.replicas.reduce(
    (total, replica) => total + replica.recordIds.length,
    0,
  );

  return {
    uniqueLogicalRecords: topology.records.length,
    primaryRecordCopies,
    physicalRecordCopies: primaryRecordCopies + replicaRecordCopies,
    primaryRecordCountByShard,
  };
}

function createComputeNodes(count: number): ComputeNode[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `compute-node-${index + 1}`,
    status: "available" as const,
  }));
}

function createEmptyShards(
  input: DatabaseTopologyInput,
): MutableShard[] {
  return Array.from({ length: input.shardCount }, (_, index) => ({
    id: `shard-${index + 1}`,
    databaseId: input.databaseId,
    logicalPartitionIds: [],
    primaryInstanceId: "",
    replicaIds: [],
    primaryRecordIds: [],
  }));
}

function createEmptyPartitions(
  input: DatabaseTopologyInput,
): MutablePartition[] {
  return Array.from({ length: input.logicalPartitionCount }, (_, index) => {
    const shardIndex = index % input.shardCount;
    return {
      id: `partition-${index + 1}`,
      databaseId: input.databaseId,
      recordIds: [],
      primaryShardId: `shard-${shardIndex + 1}`,
    };
  });
}

function createRecords(
  input: DatabaseTopologyInput,
  partitions: MutablePartition[],
  shards: MutableShard[],
): LogicalRecord[] {
  const records: LogicalRecord[] = [];
  const hotPartitionIndex = positiveModulo(input.seed, partitions.length);
  const hotRecordCount = Math.ceil(input.recordCount * 0.7);

  for (let index = 0; index < input.recordCount; index += 1) {
    const partitionIndex =
      input.distribution === "hot"
        ? index < hotRecordCount
          ? hotPartitionIndex
          : (hotPartitionIndex + 1 + index - hotRecordCount) %
            partitions.length
        : (index + positiveModulo(input.seed, partitions.length)) %
          partitions.length;
    const partition = partitions[partitionIndex];
    const shard = shards.find((candidate) => candidate.id === partition.primaryShardId);

    if (!shard) {
      throw new Error(`Missing shard for partition ${partition.id}`);
    }

    const record: LogicalRecord = {
      id: `record-${String(index + 1).padStart(6, "0")}`,
      shardKey: input.distribution === "hot" && index < hotRecordCount
        ? "hot-key"
        : `key-${index + 1}`,
      logicalPartitionId: partition.id,
      primaryShardId: shard.id,
    };
    records.push(record);
    partition.recordIds = [...partition.recordIds, record.id];
    shard.primaryRecordIds = [...shard.primaryRecordIds, record.id];
    shard.logicalPartitionIds = shard.logicalPartitionIds.includes(partition.id)
      ? shard.logicalPartitionIds
      : [...shard.logicalPartitionIds, partition.id];
  }

  return records;
}

function createDatabaseInstances(
  input: DatabaseTopologyInput,
  shards: MutableShard[],
  computeNodes: ComputeNode[],
): DatabaseInstance[] {
  const instances: DatabaseInstance[] = [];

  for (const [shardIndex, shard] of shards.entries()) {
    const primaryInstanceId = `${shard.id}-primary`;
    shard.primaryInstanceId = primaryInstanceId;
    instances.push({
      id: primaryInstanceId,
      physicalShardId: shard.id,
      computeNodeId: computeNodes[shardIndex % computeNodes.length].id,
      role: "primary",
      status: "available",
      committedVersion: 0,
      appliedVersion: 0,
    });

    for (let replicaIndex = 0; replicaIndex < input.replicaCount; replicaIndex += 1) {
      instances.push({
        id: `${shard.id}-replica-${replicaIndex + 1}`,
        physicalShardId: shard.id,
        computeNodeId:
          computeNodes[
            (shardIndex + replicaIndex + 1) % computeNodes.length
          ].id,
        role: "replica",
        status: "available",
        committedVersion: 0,
        appliedVersion: 0,
      });
    }
  }

  return instances;
}

function createReplicas(
  input: DatabaseTopologyInput,
  shards: MutableShard[],
  instances: DatabaseInstance[],
): Replica[] {
  const replicas: Replica[] = [];

  for (const shard of shards) {
    const shardReplicaInstances = instances.filter(
      (instance) =>
        instance.physicalShardId === shard.id && instance.role === "replica",
    );
    for (const [replicaIndex, instance] of shardReplicaInstances.entries()) {
      const replica: Replica = {
        id: `${shard.id}-copy-${replicaIndex + 1}`,
        physicalShardId: shard.id,
        databaseInstanceId: instance.id,
        primaryInstanceId: shard.primaryInstanceId,
        recordIds: [...shard.primaryRecordIds],
        appliedVersion: 0,
      };
      replicas.push(replica);
      shard.replicaIds = [...shard.replicaIds, replica.id];
    }
  }

  return replicas;
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
