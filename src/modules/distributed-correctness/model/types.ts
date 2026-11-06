import type { Explanation, TimelineEvent } from "../../../simulations/types";

export type CommitOutcome = "committed" | "rejected";
export type ResponseDelivery = "delivered" | "lost";
export type RetryPolicy = "none" | "retry-timeout";

export interface TimeoutRetryInput {
  readonly operationId: string;
  readonly commitOutcome: CommitOutcome;
  readonly responsePlan: readonly ResponseDelivery[];
  readonly retryPolicy: RetryPolicy;
  readonly maxAttempts: number;
}

export type ClientOutcome =
  | "known-success"
  | "known-rejection"
  | "unknown-after-timeout";

export interface TimeoutRetryResult {
  readonly clientOutcome: ClientOutcome;
  readonly serverCommitState: CommitOutcome;
  readonly attemptCount: number;
  readonly businessEffectCount: number;
  readonly events: readonly TimelineEvent[];
  readonly explanations: readonly Explanation[];
}

export interface IdempotencyInput {
  readonly operationId: string;
  readonly requestCount: number;
  readonly idempotencyKey?: string;
}

export interface IdempotencyResult {
  readonly businessEffectCount: number;
  readonly duplicateSuppressedCount: number;
  readonly events: readonly TimelineEvent[];
  readonly explanations: readonly Explanation[];
}

export type DeliveryOutcome = "delivered" | "lost";

export interface OutboxDeliveryInput {
  readonly operationId: string;
  readonly businessCommitOutcome: CommitOutcome;
  readonly deliveryPlan: readonly DeliveryOutcome[];
  readonly consumerIdempotent: boolean;
}

export interface OutboxDeliveryResult {
  readonly businessStateCommitted: boolean;
  readonly outboxRecordCreated: boolean;
  readonly deliveryAttemptCount: number;
  readonly consumerEffectCount: number;
  readonly duplicateDeliveryCount: number;
  readonly events: readonly TimelineEvent[];
  readonly explanations: readonly Explanation[];
}

export interface ReconciliationRecord {
  readonly id: string;
  readonly value: string;
}

export interface ReconciliationInput {
  readonly authoritativeRecords: readonly ReconciliationRecord[];
  readonly derivedRecords: readonly ReconciliationRecord[];
}

export type RepairActionKind =
  | "create-missing"
  | "remove-extra"
  | "update-divergent";

export interface RepairAction {
  readonly kind: RepairActionKind;
  readonly recordId: string;
  readonly value?: string;
}

export interface ReconciliationResult {
  readonly missingRecordIds: readonly string[];
  readonly extraRecordIds: readonly string[];
  readonly divergentRecordIds: readonly string[];
  readonly repairActions: readonly RepairAction[];
  readonly events: readonly TimelineEvent[];
  readonly explanations: readonly Explanation[];
}

export type DeliveryMode =
  | "at-most-once"
  | "at-least-once"
  | "effectively-once";

export interface DeliverySemanticsInput {
  readonly messageId: string;
  readonly deliveryMode: DeliveryMode;
  readonly deliveryPlan: readonly DeliveryOutcome[];
  readonly consumerIdempotent: boolean;
}

export interface DeliverySemanticsResult {
  readonly deliveryAttemptCount: number;
  readonly messageDelivered: boolean;
  readonly businessEffectCount: number;
  readonly duplicateDeliveryCount: number;
  readonly duplicateSuppressedCount: number;
  readonly events: readonly TimelineEvent[];
  readonly explanations: readonly Explanation[];
}
