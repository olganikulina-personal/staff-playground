import type { TimelineEvent } from "../../../simulations/types";
import type {
  IdempotencyInput,
  IdempotencyResult,
} from "../model/types";

export function simulateIdempotency(
  input: IdempotencyInput,
): IdempotencyResult {
  validateInput(input);

  const events: TimelineEvent[] = [];
  let businessEffectCount = 0;
  let duplicateSuppressedCount = 0;
  let keySeen = false;

  for (let requestNumber = 1; requestNumber <= input.requestCount; requestNumber += 1) {
    events.push(
      makeEvent(
        events.length + 1,
        "request-received",
        "Request received",
        `Request ${requestNumber} references operation ${input.operationId}.`,
      ),
    );

    if (input.idempotencyKey && keySeen) {
      duplicateSuppressedCount += 1;
      events.push(
        makeEvent(
          events.length + 1,
          "duplicate-suppressed",
          "Duplicate suppressed",
          `The stable idempotency key ${input.idempotencyKey} matches a committed request.`,
        ),
      );
      continue;
    }

    businessEffectCount += 1;
    keySeen = Boolean(input.idempotencyKey);
    events.push(
      makeEvent(
        events.length + 1,
        "business-effect-applied",
        "Business effect applied",
        `The request produced business effect ${businessEffectCount}.`,
      ),
    );
  }

  return {
    businessEffectCount,
    duplicateSuppressedCount,
    events,
    explanations: [
      {
        title: "Idempotency key",
        mechanism:
          "A stable request identity lets the receiver recognize a repeated operation after the first commit.",
        tradeoff:
          "Deduplication requires retaining identity state and defining how long a key remains valid.",
        failureMode:
          input.idempotencyKey
            ? "A key that is reused for different business intent can suppress a legitimate request."
            : "Repeated requests can apply the same business effect more than once.",
        eventSequences: events.map((event) => event.sequence),
      },
    ],
  };
}

function validateInput(input: IdempotencyInput): void {
  if (!input.operationId.trim()) {
    throw new RangeError("Operation id must not be empty");
  }

  if (!Number.isInteger(input.requestCount) || input.requestCount < 1) {
    throw new RangeError("Request count must be a positive integer");
  }

  if (input.idempotencyKey !== undefined && !input.idempotencyKey.trim()) {
    throw new RangeError("Idempotency key must not be empty");
  }
}

function makeEvent(
  sequence: number,
  kind: string,
  label: string,
  detail: string,
): TimelineEvent {
  return {
    sequence,
    kind,
    label,
    detail,
    simulated: true,
  };
}
