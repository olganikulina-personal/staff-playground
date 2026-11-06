import type { ParameterField } from "../../components/ParameterControls";
import {
  DEFAULT_REACT_PERFORMANCE_PARAMETERS,
  type ReactPerformanceLabParameters,
} from "./labRunner";
import {
  REACT_PERFORMANCE_SCENARIO_LABELS,
} from "./content";
import type {
  DerivedComputationVariant,
  PerformanceScenarioId,
  PerformanceVariant,
  RenderPropagationVariant,
} from "./model/types";

export function createReactPerformanceParameterFields(
  parameters: ReactPerformanceLabParameters,
): readonly ParameterField[] {
  return [
    {
      id: "scenario",
      label: "Scenario",
      inputType: "select",
      value: parameters.scenario,
      options: Object.entries(REACT_PERFORMANCE_SCENARIO_LABELS).map(
        ([value, label]) => ({ value, label }),
      ),
    },
    {
      id: "renderVariant",
      label: "Render variant",
      inputType: "select",
      value: parameters.renderVariant,
      options: [
        {
          value: "non-memoized-unstable",
          label: "No memoization · unstable props",
        },
        { value: "memoized-unstable", label: "Memoized · unstable props" },
        { value: "memoized-stable", label: "Memoized · stable props" },
      ],
    },
    {
      id: "computationVariant",
      label: "Computation variant",
      inputType: "select",
      value: parameters.computationVariant,
      options: [
        { value: "baseline", label: "Recompute every render" },
        { value: "optimized", label: "Memoize derived value" },
      ],
    },
    {
      id: "workerVariant",
      label: "Work location",
      inputType: "select",
      value: parameters.workerVariant,
      options: [
        { value: "baseline", label: "Main thread" },
        { value: "optimized", label: "Web Worker" },
      ],
    },
    {
      id: "responsivenessVariant",
      label: "Responsiveness variant",
      inputType: "select",
      value: parameters.responsivenessVariant,
      options: [
        { value: "baseline", label: "Blocking work" },
        { value: "optimized", label: "Worker-backed work" },
      ],
    },
    {
      id: "parentUpdateCount",
      label: "Parent updates",
      inputType: "number",
      value: parameters.parentUpdateCount,
      min: 1,
      max: 100,
    },
    {
      id: "computationSize",
      label: "Computation size",
      inputType: "number",
      value: parameters.computationSize,
      min: 1,
      max: 2000,
    },
    {
      id: "seed",
      label: "Workload seed",
      inputType: "number",
      value: parameters.seed,
    },
    {
      id: "runtimeMode",
      label: "Runtime mode",
      inputType: "select",
      value: parameters.runtimeMode,
      options: [
        { value: "development", label: "Development" },
        { value: "production", label: "Production" },
        { value: "unknown", label: "Unknown" },
      ],
    },
    {
      id: "strictMode",
      label: "Strict Mode",
      inputType: "select",
      value: String(parameters.strictMode),
      options: [
        { value: "false", label: "Disabled" },
        { value: "true", label: "Enabled" },
      ],
    },
  ];
}

export function updateReactPerformanceParameters(
  parameters: ReactPerformanceLabParameters,
  fieldId: string,
  value: string,
): ReactPerformanceLabParameters {
  if (
    fieldId === "parentUpdateCount" ||
    fieldId === "computationSize" ||
    fieldId === "seed"
  ) {
    return { ...parameters, [fieldId]: Number(value) };
  }

  if (fieldId === "strictMode") {
    return { ...parameters, strictMode: value === "true" };
  }

  if (fieldId === "scenario" && isPerformanceScenarioId(value)) {
    return { ...parameters, scenario: value };
  }
  if (fieldId === "renderVariant" && isRenderPropagationVariant(value)) {
    return { ...parameters, renderVariant: value };
  }
  if (fieldId === "computationVariant" && isDerivedComputationVariant(value)) {
    return { ...parameters, computationVariant: value };
  }
  if (
    (fieldId === "workerVariant" || fieldId === "responsivenessVariant") &&
    isPerformanceVariant(value)
  ) {
    return { ...parameters, [fieldId]: value };
  }
  if (
    fieldId === "runtimeMode" &&
    (value === "development" || value === "production" || value === "unknown")
  ) {
    return { ...parameters, runtimeMode: value };
  }

  return DEFAULT_REACT_PERFORMANCE_PARAMETERS;
}

function isPerformanceScenarioId(value: string): value is PerformanceScenarioId {
  return value in REACT_PERFORMANCE_SCENARIO_LABELS;
}

function isRenderPropagationVariant(
  value: string,
): value is RenderPropagationVariant {
  return (
    value === "non-memoized-unstable" ||
    value === "memoized-unstable" ||
    value === "memoized-stable"
  );
}

function isDerivedComputationVariant(
  value: string,
): value is DerivedComputationVariant {
  return value === "baseline" || value === "optimized";
}

function isPerformanceVariant(value: string): value is PerformanceVariant {
  return value === "baseline" || value === "optimized";
}
