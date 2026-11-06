export type PerformanceScenarioId =
  | "render-propagation"
  | "derived-computation"
  | "worker-offload"
  | "responsiveness";

export type PerformanceVariant = "baseline" | "optimized";

export type RenderPropagationVariant =
  | "non-memoized-unstable"
  | "memoized-unstable"
  | "memoized-stable";

export type DerivedComputationVariant = "baseline" | "optimized";

export type MeasuredDurationMetric =
  | "commit-duration"
  | "work-duration"
  | "worker-round-trip"
  | "input-delay"
  | "interaction-latency"
  | "main-thread-task"
  | "long-task";

export type MeasuredCountMetric =
  | "render-invocations"
  | "commit-count"
  | "calculation-count";

export type UnsupportedMetric =
  | "long-task"
  | "input-delay"
  | "interaction-latency"
  | "paint";

export type MeasurementEvidence =
  | {
      readonly kind: "measured-in-browser";
      readonly metric: MeasuredDurationMetric;
      readonly value: number;
      readonly unit: "milliseconds";
    }
  | {
      readonly kind: "measured-in-browser";
      readonly metric: MeasuredCountMetric;
      readonly value: number;
      readonly unit: "count";
    }
  | {
      readonly kind: "unsupported";
      readonly metric: UnsupportedMetric;
      readonly reason: string;
    };

export interface PerformanceRuntimeConfiguration {
  readonly mode: "development" | "production" | "unknown";
  readonly strictMode: boolean;
}

export const DEFAULT_PERFORMANCE_RUNTIME_CONFIGURATION: PerformanceRuntimeConfiguration =
  {
    mode: "unknown",
    strictMode: false,
  };

export interface PerformanceMeasurementSnapshot {
  readonly runtimeConfiguration: PerformanceRuntimeConfiguration;
  readonly renderInvocations: Readonly<Record<string, number>>;
  readonly commitDurationsMs: readonly number[];
  readonly evidence: readonly MeasurementEvidence[];
}
