import type { DatabaseTopologyInput } from "./types";

export function validateTopologyInput(
  input: DatabaseTopologyInput,
): readonly string[] {
  const errors: string[] = [];

  if (input.databaseId.trim().length === 0) {
    errors.push("databaseId must not be empty");
  }
  if (!Number.isInteger(input.recordCount) || input.recordCount < 1) {
    errors.push("recordCount must be at least 1");
  }
  if (
    !Number.isInteger(input.logicalPartitionCount) ||
    input.logicalPartitionCount < 1
  ) {
    errors.push("logicalPartitionCount must be at least 1");
  }
  if (!Number.isInteger(input.shardCount) || input.shardCount < 1) {
    errors.push("shardCount must be at least 1");
  }
  if (!Number.isInteger(input.replicaCount) || input.replicaCount < 0) {
    errors.push("replicaCount must be 0 or greater");
  }
  if (
    !Number.isInteger(input.computeNodeCount) ||
    input.computeNodeCount < 1
  ) {
    errors.push("computeNodeCount must be at least 1");
  }
  if (!Number.isInteger(input.seed)) {
    errors.push("seed must be an integer");
  }

  return errors;
}
