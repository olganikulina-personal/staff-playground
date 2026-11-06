import type {
  DecisionQuestion,
  Explanation,
  TimelineEvent,
} from "../../simulations/types";
import type {
  MeasurementEvidence,
  PerformanceMeasurementSnapshot,
  PerformanceRuntimeConfiguration,
  PerformanceScenarioId,
  PerformanceVariant,
  RenderPropagationVariant,
  DerivedComputationVariant,
} from "./model/types";
import { DEFAULT_PERFORMANCE_RUNTIME_CONFIGURATION } from "./model/types";
import {
  REACT_PERFORMANCE_CAVEATS,
  REACT_PERFORMANCE_DECISION_QUESTIONS,
  REACT_PERFORMANCE_EXPLANATIONS,
  REACT_PERFORMANCE_SCENARIO_LABELS,
} from "./content";
import {
  DEFAULT_PERFORMANCE_WORKLOAD,
  validatePerformanceWorkload,
  type PerformanceWorkloadParameters,
} from "./measurement/workloads";

export type { PerformanceScenarioId } from "./model/types";

export interface ReactPerformanceLabParameters
  extends PerformanceWorkloadParameters {
  readonly scenario: PerformanceScenarioId;
  readonly renderVariant: RenderPropagationVariant;
  readonly computationVariant: DerivedComputationVariant;
  readonly workerVariant: PerformanceVariant;
  readonly responsivenessVariant: PerformanceVariant;
  readonly runtimeMode: PerformanceRuntimeConfiguration["mode"];
  readonly strictMode: boolean;
}

export const DEFAULT_REACT_PERFORMANCE_PARAMETERS: ReactPerformanceLabParameters =
  {
    ...DEFAULT_PERFORMANCE_WORKLOAD,
    scenario: "render-propagation",
    renderVariant: "memoized-stable",
    computationVariant: "optimized",
    workerVariant: "optimized",
    responsivenessVariant: "optimized",
    runtimeMode: DEFAULT_PERFORMANCE_RUNTIME_CONFIGURATION.mode,
    strictMode: DEFAULT_PERFORMANCE_RUNTIME_CONFIGURATION.strictMode,
  };

export interface ReactPerformanceMeasurementInput {
  readonly snapshot: PerformanceMeasurementSnapshot;
  readonly additionalEvidence?: readonly MeasurementEvidence[];
  readonly events?: readonly TimelineEvent[];
}

export interface ReactPerformanceLabResult {
  readonly scenario: PerformanceScenarioId;
  readonly scenarioLabel: string;
  readonly variantLabel: string;
  readonly observations: readonly {
    readonly label: string;
    readonly value: string;
  }[];
  readonly evidence: readonly MeasurementEvidence[];
  readonly events: readonly TimelineEvent[];
  readonly explanations: readonly Explanation[];
  readonly decisionQuestion: DecisionQuestion;
  readonly caveat: string;
}

export type ReactPerformanceRunResult =
  | {
      readonly ok: true;
      readonly result: ReactPerformanceLabResult;
    }
  | {
      readonly ok: false;
      readonly error: string;
    };

export function runReactPerformanceScenario(
  parameters: ReactPerformanceLabParameters,
  input: ReactPerformanceMeasurementInput,
): ReactPerformanceRunResult {
  const validation = validatePerformanceWorkload(parameters);
  if (!validation.ok) return validation;

  const evidence = [
    ...input.snapshot.evidence,
    ...(input.additionalEvidence ?? []),
  ];
  const runtime = input.snapshot.runtimeConfiguration;
  const observations = [
    {
      label: "Scenario",
      value: REACT_PERFORMANCE_SCENARIO_LABELS[parameters.scenario],
    },
    { label: "Variant", value: variantLabel(parameters) },
    { label: "Runtime", value: formatRuntime(runtime) },
    ...renderObservations(input.snapshot),
    ...formatEvidenceObservations(evidence),
  ];

  return {
    ok: true,
    result: {
      scenario: parameters.scenario,
      scenarioLabel: REACT_PERFORMANCE_SCENARIO_LABELS[parameters.scenario],
      variantLabel: variantLabel(parameters),
      observations,
      evidence,
      events: input.events ?? [],
      explanations: REACT_PERFORMANCE_EXPLANATIONS[parameters.scenario],
      decisionQuestion: REACT_PERFORMANCE_DECISION_QUESTIONS[parameters.scenario],
      caveat: REACT_PERFORMANCE_CAVEATS[parameters.scenario],
    },
  };
}

function variantLabel(parameters: ReactPerformanceLabParameters): string {
  switch (parameters.scenario) {
    case "render-propagation":
      return parameters.renderVariant;
    case "derived-computation":
      return parameters.computationVariant;
    case "worker-offload":
      return parameters.workerVariant === "optimized"
        ? "Web Worker"
        : "Main thread";
    case "responsiveness":
      return parameters.responsivenessVariant === "optimized"
        ? "Worker-backed work"
        : "Blocking work";
  }
}

function formatRuntime(runtime: PerformanceRuntimeConfiguration): string {
  return `${runtime.mode}, Strict Mode ${
    runtime.strictMode ? "enabled" : "disabled"
  }`;
}

function renderObservations(
  snapshot: PerformanceMeasurementSnapshot,
): readonly { label: string; value: string }[] {
  const observations: { label: string; value: string }[] = [];
  const childRenderCount = snapshot.renderInvocations.child;
  if (childRenderCount !== undefined) {
    observations.push({
      label: "Child render invocations",
      value: String(childRenderCount),
    });
  }
  if (snapshot.commitDurationsMs.length > 0) {
    observations.push({
      label: "Profiler commits",
      value: String(snapshot.commitDurationsMs.length),
    });
  }
  return observations;
}

function formatEvidence(
  evidence: MeasurementEvidence,
): { label: string; value: string } {
  const label = metricLabel(evidence.metric);
  if (evidence.kind === "unsupported") {
    return { label, value: `Unsupported: ${evidence.reason}` };
  }
  return {
    label,
    value:
      evidence.unit === "milliseconds"
        ? `${evidence.value.toFixed(2)} ms`
        : String(evidence.value),
  };
}

function formatEvidenceObservations(
  evidence: readonly MeasurementEvidence[],
): readonly { label: string; value: string }[] {
  const observations = new Map<string, { label: string; value: string }>();
  for (const item of evidence) {
    const observation = formatEvidence(item);
    observations.set(observation.label, observation);
  }
  return [...observations.values()];
}

function metricLabel(metric: MeasurementEvidence["metric"]): string {
  return metric
    .split("-")
    .map((part, index) =>
      index === 0
        ? part[0].toUpperCase() + part.slice(1)
        : part.toLowerCase(),
    )
    .join(" ");
}
