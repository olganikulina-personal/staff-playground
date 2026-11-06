import type { DecisionQuestion } from "../../simulations/types";
import type { DistributedScenarioId } from "./labRunner";

export const DISTRIBUTED_SCENARIO_LABELS: Record<DistributedScenarioId, string> = {
  "timeout-ambiguity": "Timeout ambiguity",
  "retry-policy": "Retries and repeated effects",
  idempotency: "Idempotency keys",
  "transactional-outbox": "Transactional outbox",
  reconciliation: "Reconciliation",
  "delivery-semantics": "Delivery semantics",
};

export const DISTRIBUTED_CAVEATS = {
  timeout:
    "This lab models response loss with logical events; it does not measure network timeout durations.",
  retries:
    "Retry counts and effect counts are illustrative outcomes from the selected plan, not reliability estimates.",
  idempotency:
    "A stable key suppresses repeated modeled intent only while the receiver retains its deduplication state.",
  outbox:
    "The outbox models one local atomic commit boundary; it is not a production database or queue.",
  reconciliation:
    "The authoritative record set is selected by the scenario and may not represent every real ownership policy.",
  delivery:
    "Effectively-once is an application-level modeled result; exactly-once transport is not claimed.",
} as const;

export const DISTRIBUTED_DECISION_QUESTIONS: Record<
  DistributedScenarioId,
  DecisionQuestion
> = {
  "timeout-ambiguity": {
    prompt: "What should the client do after a timeout with an unknown server outcome?",
    options: [
      "Retry with an idempotency key",
      "Ask the user to retry manually",
      "Treat the operation as rejected",
    ],
    reasoningFocus:
      "Separate user-visible certainty from server-side commit state.",
  },
  "retry-policy": {
    prompt: "When is retrying an ambiguous operation safe enough?",
    options: [
      "Only with bounded attempts and stable identity",
      "Whenever the client sees a timeout",
      "Never retry a timed-out operation",
    ],
    reasoningFocus:
      "Connect retry policy to duplicate side effects and recovery guarantees.",
  },
  idempotency: {
    prompt: "Where should duplicate request identity be enforced?",
    options: [
      "At the business-effect boundary",
      "Only in the client UI",
      "Do not retain request identity",
    ],
    reasoningFocus:
      "Tie deduplication to the component that owns the side effect.",
  },
  "transactional-outbox": {
    prompt: "What problem does the outbox solve, and what remains asynchronous?",
    options: [
      "Persist delivery intent with business state",
      "Guarantee exactly-once transport",
      "Remove the need for consumer deduplication",
    ],
    reasoningFocus:
      "Separate local atomicity from later delivery and consumption.",
  },
  reconciliation: {
    prompt: "Which side should control repair when derived state diverges?",
    options: [
      "The explicitly authoritative source",
      "Whichever side was read most recently",
      "The side with more records",
    ],
    reasoningFocus:
      "Name the authority and preserve mismatch evidence before repair.",
  },
  "delivery-semantics": {
    prompt: "Which delivery contract best fits a duplicate-tolerant consumer?",
    options: [
      "At-least-once with idempotent handling",
      "At-most-once without recovery",
      "Exactly-once transport",
    ],
    reasoningFocus:
      "Balance loss, duplication, and application-level deduplication.",
  },
};
