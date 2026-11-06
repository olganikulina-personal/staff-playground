export interface PerformanceWorkloadParameters {
  readonly parentUpdateCount: number;
  readonly computationSize: number;
  readonly seed: number;
}

export const DEFAULT_PERFORMANCE_WORKLOAD: PerformanceWorkloadParameters = {
  parentUpdateCount: 3,
  computationSize: 128,
  seed: 17,
};

export type WorkloadValidationResult =
  | {
      readonly ok: true;
      readonly value: PerformanceWorkloadParameters;
    }
  | {
      readonly ok: false;
      readonly error: string;
    };

export function validatePerformanceWorkload(
  parameters: PerformanceWorkloadParameters,
): WorkloadValidationResult {
  if (
    !Number.isInteger(parameters.parentUpdateCount) ||
    parameters.parentUpdateCount < 1 ||
    parameters.parentUpdateCount > 100
  ) {
    return {
      ok: false,
      error: "parentUpdateCount must be between 1 and 100.",
    };
  }

  if (
    !Number.isInteger(parameters.computationSize) ||
    parameters.computationSize < 1 ||
    parameters.computationSize > 2000
  ) {
    return {
      ok: false,
      error: "computationSize must be between 1 and 2000.",
    };
  }

  if (!Number.isInteger(parameters.seed)) {
    return {
      ok: false,
      error: "seed must be an integer.",
    };
  }

  return { ok: true, value: { ...parameters } };
}

export function runDeterministicWorkload(
  seed: number,
  computationSize: number,
): number {
  let value = seed;

  for (let index = 0; index < computationSize; index += 1) {
    value = (value * 31 + index * 17 + 7) % 1_000_003;
  }

  return value;
}
