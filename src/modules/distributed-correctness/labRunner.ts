import { simulateDeliverySemantics } from "./simulation/delivery";
import { simulateIdempotency } from "./simulation/idempotency";
import { simulateOutboxDelivery } from "./simulation/outbox";
import { simulateReconciliation } from "./simulation/reconciliation";
import {
  simulateTimeoutRetry,
  type ResponseDelivery,
} from "./simulation/timeout";
import type { DeliveryOutcome } from "./model/types";
import {
  DISTRIBUTED_DECISION_QUESTIONS,
  DISTRIBUTED_SCENARIO_LABELS,
} from "./content";
import type {
  CommitOutcome,
  DeliveryMode,
  RetryPolicy,
} from "./model/types";
import type {
  DecisionQuestion,
  Explanation,
  TimelineEvent,
} from "../../simulations/types";

export type DistributedScenarioId =
  | "timeout-ambiguity"
  | "retry-policy"
  | "idempotency"
  | "transactional-outbox"
  | "reconciliation"
  | "delivery-semantics";

export type ResponsePlanMode =
  | "lost"
  | "lost-then-delivered"
  | "delivered";

export type DeliveryPlanMode =
  | "none"
  | "lost"
  | "lost-then-delivered"
  | "duplicate-delivery";

export interface DistributedLabParameters {
  readonly scenario: DistributedScenarioId;
  readonly operationId: string;
  readonly commitOutcome: CommitOutcome;
  readonly responsePlanMode: ResponsePlanMode;
  readonly retryPolicy: RetryPolicy;
  readonly maxAttempts: number;
  readonly requestCount: number;
  readonly idempotencyKeyEnabled: boolean;
  readonly deliveryPlanMode: DeliveryPlanMode;
  readonly consumerIdempotent: boolean;
  readonly deliveryMode: DeliveryMode;
  readonly reconciliationMode: "matching" | "mismatch";
  readonly seed: number;
}

export interface DistributedLabResult {
  readonly scenario: DistributedScenarioId;
  readonly scenarioLabel: string;
  readonly observations: readonly {
    readonly label: string;
    readonly value: string;
  }[];
  readonly events: readonly TimelineEvent[];
  readonly explanations: readonly Explanation[];
  readonly decisionQuestion: DecisionQuestion;
}

export type DistributedLabRunResult =
  | {
      readonly ok: true;
      readonly result: DistributedLabResult;
    }
  | {
      readonly ok: false;
      readonly error: string;
    };

export const DEFAULT_DISTRIBUTED_PARAMETERS: DistributedLabParameters = {
  scenario: "timeout-ambiguity",
  operationId: "operation-1",
  commitOutcome: "committed",
  responsePlanMode: "lost",
  retryPolicy: "none",
  maxAttempts: 2,
  requestCount: 2,
  idempotencyKeyEnabled: true,
  deliveryPlanMode: "lost-then-delivered",
  consumerIdempotent: true,
  deliveryMode: "effectively-once",
  reconciliationMode: "mismatch",
  seed: 17,
};

export function runDistributedCorrectnessScenario(
  parameters: DistributedLabParameters,
): DistributedLabRunResult {
  try {
    const scenario = runScenario(parameters);
    return {
      ok: true,
      result: {
        scenario: parameters.scenario,
        scenarioLabel: DISTRIBUTED_SCENARIO_LABELS[parameters.scenario],
        observations: scenario.observations,
        events: scenario.events,
        explanations: scenario.explanations,
        decisionQuestion:
          DISTRIBUTED_DECISION_QUESTIONS[parameters.scenario],
      },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "The distributed scenario could not be executed.",
    };
  }
}

function runScenario(
  parameters: DistributedLabParameters,
): Omit<DistributedLabResult, "scenario" | "scenarioLabel" | "decisionQuestion"> {
  switch (parameters.scenario) {
    case "timeout-ambiguity": {
      const result = simulateTimeoutRetry({
        operationId: parameters.operationId,
        commitOutcome: parameters.commitOutcome,
        responsePlan: responsePlan(parameters.responsePlanMode),
        retryPolicy: "none",
        maxAttempts: 1,
      });
      return {
        observations: [
          { label: "Client outcome", value: result.clientOutcome },
          { label: "Server state", value: result.serverCommitState },
          { label: "Business effects", value: String(result.businessEffectCount) },
        ],
        events: result.events,
        explanations: result.explanations,
      };
    }
    case "retry-policy": {
      const result = simulateTimeoutRetry({
        operationId: parameters.operationId,
        commitOutcome: parameters.commitOutcome,
        responsePlan: responsePlan(parameters.responsePlanMode),
        retryPolicy: parameters.retryPolicy,
        maxAttempts: parameters.maxAttempts,
      });
      return {
        observations: [
          { label: "Client outcome", value: result.clientOutcome },
          { label: "Attempts", value: String(result.attemptCount) },
          { label: "Business effects", value: String(result.businessEffectCount) },
        ],
        events: result.events,
        explanations: result.explanations,
      };
    }
    case "idempotency": {
      const result = simulateIdempotency({
        operationId: parameters.operationId,
        requestCount: parameters.requestCount,
        idempotencyKey: parameters.idempotencyKeyEnabled
          ? `${parameters.operationId}-key`
          : undefined,
      });
      return {
        observations: [
          { label: "Requests", value: String(parameters.requestCount) },
          { label: "Business effects", value: String(result.businessEffectCount) },
          {
            label: "Duplicates suppressed",
            value: String(result.duplicateSuppressedCount),
          },
        ],
        events: result.events,
        explanations: result.explanations,
      };
    }
    case "transactional-outbox": {
      const result = simulateOutboxDelivery({
        operationId: parameters.operationId,
        businessCommitOutcome: parameters.commitOutcome,
        deliveryPlan: deliveryPlan(parameters.deliveryPlanMode),
        consumerIdempotent: parameters.consumerIdempotent,
      });
      return {
        observations: [
          {
            label: "Business state",
            value: result.businessStateCommitted ? "Committed" : "Rejected",
          },
          {
            label: "Outbox record",
            value: result.outboxRecordCreated ? "Created" : "Not created",
          },
          {
            label: "Consumer effects",
            value: String(result.consumerEffectCount),
          },
        ],
        events: result.events,
        explanations: result.explanations,
      };
    }
    case "reconciliation": {
      const result = simulateReconciliation(
        parameters.reconciliationMode === "mismatch"
          ? {
              authoritativeRecords: [
                { id: "a", value: "paid" },
                { id: "b", value: "shipped" },
                { id: "c", value: "delivered" },
              ],
              derivedRecords: [
                { id: "a", value: "paid" },
                { id: "b", value: "pending" },
                { id: "d", value: "cancelled" },
              ],
            }
          : {
              authoritativeRecords: [{ id: "a", value: "paid" }],
              derivedRecords: [{ id: "a", value: "paid" }],
            },
      );
      return {
        observations: [
          { label: "Missing records", value: String(result.missingRecordIds.length) },
          { label: "Extra records", value: String(result.extraRecordIds.length) },
          {
            label: "Repairs planned",
            value: String(result.repairActions.length),
          },
        ],
        events: result.events,
        explanations: result.explanations,
      };
    }
    case "delivery-semantics": {
      const result = simulateDeliverySemantics({
        messageId: parameters.operationId,
        deliveryMode: parameters.deliveryMode,
        deliveryPlan: deliveryPlan(parameters.deliveryPlanMode),
        consumerIdempotent: parameters.consumerIdempotent,
      });
      return {
        observations: [
          { label: "Delivery mode", value: parameters.deliveryMode },
          {
            label: "Message delivered",
            value: result.messageDelivered ? "Yes" : "No",
          },
          {
            label: "Business effects",
            value: String(result.businessEffectCount),
          },
        ],
        events: result.events,
        explanations: result.explanations,
      };
    }
  }
}

function responsePlan(mode: ResponsePlanMode): readonly ResponseDelivery[] {
  switch (mode) {
    case "lost":
      return ["lost"];
    case "lost-then-delivered":
      return ["lost", "delivered"];
    case "delivered":
      return ["delivered"];
  }
}

function deliveryPlan(mode: DeliveryPlanMode): readonly DeliveryOutcome[] {
  switch (mode) {
    case "none":
      return [];
    case "lost":
      return ["lost"];
    case "lost-then-delivered":
      return ["lost", "delivered"];
    case "duplicate-delivery":
      return ["delivered", "delivered"];
  }
}
