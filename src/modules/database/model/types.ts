export type DistributionMode = "even" | "hot";
export type DatabaseInstanceRole = "primary" | "replica";
export type Availability = "available" | "failed";

export interface DatabaseTopologyInput {
  readonly databaseId: string;
  readonly recordCount: number;
  readonly logicalPartitionCount: number;
  readonly shardCount: number;
  readonly replicaCount: number;
  readonly computeNodeCount: number;
  readonly distribution: DistributionMode;
  readonly seed: number;
}

export interface LogicalDatabase {
  readonly id: string;
  readonly name: string;
}

export interface LogicalRecord {
  readonly id: string;
  readonly shardKey: string;
  readonly logicalPartitionId: string;
  readonly primaryShardId: string;
}

export interface LogicalPartition {
  readonly id: string;
  readonly databaseId: string;
  readonly recordIds: readonly string[];
  readonly primaryShardId: string;
}

export interface ComputeNode {
  readonly id: string;
  readonly status: Availability;
}

export interface DatabaseInstance {
  readonly id: string;
  readonly physicalShardId: string;
  readonly computeNodeId: string;
  readonly role: DatabaseInstanceRole;
  readonly status: Availability;
  readonly committedVersion: number;
  readonly appliedVersion: number;
}

export interface Replica {
  readonly id: string;
  readonly physicalShardId: string;
  readonly databaseInstanceId: string;
  readonly primaryInstanceId: string;
  readonly recordIds: readonly string[];
  readonly appliedVersion: number;
}

export interface PhysicalShard {
  readonly id: string;
  readonly databaseId: string;
  readonly logicalPartitionIds: readonly string[];
  readonly primaryInstanceId: string;
  readonly replicaIds: readonly string[];
  readonly primaryRecordIds: readonly string[];
}

export interface DatabaseTopology {
  readonly logicalDatabase: LogicalDatabase;
  readonly records: readonly LogicalRecord[];
  readonly logicalPartitions: readonly LogicalPartition[];
  readonly physicalShards: readonly PhysicalShard[];
  readonly computeNodes: readonly ComputeNode[];
  readonly databaseInstances: readonly DatabaseInstance[];
  readonly replicas: readonly Replica[];
}

export interface AllocationSummary {
  readonly uniqueLogicalRecords: number;
  readonly primaryRecordCopies: number;
  readonly physicalRecordCopies: number;
  readonly primaryRecordCountByShard: Readonly<Record<string, number>>;
}

export type TopologyResult =
  | {
      readonly ok: true;
      readonly topology: DatabaseTopology;
    }
  | {
      readonly ok: false;
      readonly errors: readonly string[];
    };
