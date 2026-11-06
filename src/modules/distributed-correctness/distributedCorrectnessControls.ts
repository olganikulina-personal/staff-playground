import type { ParameterField } from "../../components/ParameterControls";
import {
  DEFAULT_DISTRIBUTED_PARAMETERS,
  type DistributedLabParameters,
  type DistributedScenarioId,
} from "./labRunner";
import { DISTRIBUTED_SCENARIO_LABELS } from "./content";

export function createDistributedParameterFields(
  parameters: DistributedLabParameters,
): readonly ParameterField[] {
  return [
    {
      id: "scenario",
      label: "Scenario",
      inputType: "select",
      value: parameters.scenario,
      options: Object.entries(DISTRIBUTED_SCENARIO_LABELS).map(
        ([value, label]) => ({ value, label }),
      ),
    },
    {
      id: "commitOutcome",
      label: "Server outcome",
      inputType: "select",
      value: parameters.commitOutcome,
      options: [
        { value: "committed", label: "Committed" },
        { value: "rejected", label: "Rejected" },
      ],
    },
    {
      id: "responsePlanMode",
      label: "Response plan",
      inputType: "select",
      value: parameters.responsePlanMode,
      options: [
        { value: "lost", label: "Response lost" },
        { value: "lost-then-delivered", label: "Lost, then delivered" },
        { value: "delivered", label: "Delivered" },
      ],
    },
    {
      id: "retryPolicy",
      label: "Retry policy",
      inputType: "select",
      value: parameters.retryPolicy,
      options: [
        { value: "none", label: "No retry" },
        { value: "retry-timeout", label: "Retry after timeout" },
      ],
    },
    {
      id: "maxAttempts",
      label: "Maximum attempts",
      inputType: "number",
      value: parameters.maxAttempts,
      min: 1,
      max: 5,
    },
    {
      id: "requestCount",
      label: "Repeated requests",
      inputType: "number",
      value: parameters.requestCount,
      min: 1,
      max: 5,
    },
    {
      id: "idempotencyKeyEnabled",
      label: "Idempotency key",
      inputType: "select",
      value: String(parameters.idempotencyKeyEnabled),
      options: [
        { value: "true", label: "Enabled" },
        { value: "false", label: "Disabled" },
      ],
    },
    {
      id: "deliveryPlanMode",
      label: "Delivery plan",
      inputType: "select",
      value: parameters.deliveryPlanMode,
      options: [
        { value: "none", label: "No delivery" },
        { value: "lost", label: "Lost" },
        { value: "lost-then-delivered", label: "Lost, then delivered" },
        { value: "duplicate-delivery", label: "Delivered twice" },
      ],
    },
    {
      id: "consumerIdempotent",
      label: "Idempotent consumer",
      inputType: "select",
      value: String(parameters.consumerIdempotent),
      options: [
        { value: "true", label: "Enabled" },
        { value: "false", label: "Disabled" },
      ],
    },
    {
      id: "deliveryMode",
      label: "Delivery semantics",
      inputType: "select",
      value: parameters.deliveryMode,
      options: [
        { value: "at-most-once", label: "At-most-once" },
        { value: "at-least-once", label: "At-least-once" },
        { value: "effectively-once", label: "Effectively-once" },
      ],
    },
    {
      id: "reconciliationMode",
      label: "Record state",
      inputType: "select",
      value: parameters.reconciliationMode,
      options: [
        { value: "matching", label: "Matching" },
        { value: "mismatch", label: "Has mismatches" },
      ],
    },
  ];
}

export function updateDistributedParameters(
  parameters: DistributedLabParameters,
  fieldId: string,
  value: string,
): DistributedLabParameters {
  const numericFields = new Set(["maxAttempts", "requestCount"]);
  if (numericFields.has(fieldId)) {
    return {
      ...parameters,
      [fieldId]: Number(value),
    };
  }

  if (
    fieldId === "idempotencyKeyEnabled" ||
    fieldId === "consumerIdempotent"
  ) {
    return {
      ...parameters,
      [fieldId]: value === "true",
    };
  }

  if (
    fieldId === "scenario" ||
    fieldId === "commitOutcome" ||
    fieldId === "responsePlanMode" ||
    fieldId === "retryPolicy" ||
    fieldId === "deliveryPlanMode" ||
    fieldId === "deliveryMode" ||
    fieldId === "reconciliationMode"
  ) {
    return {
      ...parameters,
      [fieldId]: value,
    };
  }

  return DEFAULT_DISTRIBUTED_PARAMETERS;
}

export type { DistributedScenarioId };
