import type {
  Explanation,
  TimelineEvent,
} from "../../../simulations/types";
import type {
  TimeoutRetryInput,
  TimeoutRetryResult,
} from "../model/types";

export type {
  ClientOutcome,
  CommitOutcome,
  ResponseDelivery,
  RetryPolicy,
  TimeoutRetryInput,
  TimeoutRetryResult,
} from "../model/types";

export function simulateTimeoutRetry(
  input: TimeoutRetryInput,
): TimeoutRetryResult {
  validateInput(input);

  const events: TimelineEvent[] = [];
  let attemptCount = 0;
  let businessEffectCount = 0;
  let clientOutcome: TimeoutRetryResult["clientOutcome"] =
    "unknown-after-timeout";

  while (attemptCount < input.maxAttempts) {
    attemptCount += 1;
    events.push(
      makeEvent(
        events.length + 1,
        "request-attempted",
        "Request attempted",
        `Attempt ${attemptCount} sent for operation ${input.operationId}.`,
      ),
    );

    if (input.commitOutcome === "committed") {
      businessEffectCount += 1;
      events.push(
        makeEvent(
          events.length + 1,
          "server-committed",
          "Server committed effect",
          `The server committed the business effect for attempt ${attemptCount}.`,
        ),
      );
    } else {
      events.push(
        makeEvent(
          events.length + 1,
          "server-rejected",
          "Server rejected request",
          `The server rejected attempt ${attemptCount} before a business effect was committed.`,
        ),
      );
    }

    const response =
      input.responsePlan[Math.min(attemptCount - 1, input.responsePlan.length - 1)];
    if (response === "delivered") {
      events.push(
        makeEvent(
          events.length + 1,
          "response-delivered",
          "Response delivered",
          `The client received the response for attempt ${attemptCount}.`,
        ),
      );
      clientOutcome =
        input.commitOutcome === "committed"
          ? "known-success"
          : "known-rejection";
      break;
    }

    events.push(
      makeEvent(
        events.length + 1,
        "response-lost",
        "Response lost",
        `The server outcome for attempt ${attemptCount} is not visible to the client.`,
      ),
      makeEvent(
        events.length + 1,
        "client-timeout",
        "Client timed out",
        "The client cannot distinguish a committed effect from a rejection using this response.",
      ),
    );

    if (
      input.retryPolicy === "retry-timeout" &&
      attemptCount < input.maxAttempts
    ) {
      events.push(
        makeEvent(
          events.length + 1,
          "retry-attempted",
          "Retry scheduled",
          `The client will retry after ambiguous attempt ${attemptCount}.`,
        ),
      );
      continue;
    }

    break;
  }

  return {
    clientOutcome,
    serverCommitState: input.commitOutcome,
    attemptCount,
    businessEffectCount,
    events,
    explanations: createExplanations(clientOutcome, input.retryPolicy),
  };
}

function validateInput(input: TimeoutRetryInput): void {
  if (!input.operationId.trim()) {
    throw new RangeError("Operation id must not be empty");
  }

  if (!Number.isInteger(input.maxAttempts) || input.maxAttempts < 1) {
    throw new RangeError("Maximum attempts must be a positive integer");
  }

  if (input.responsePlan.length === 0) {
    throw new RangeError("Response plan must contain at least one outcome");
  }
}

function createExplanations(
  clientOutcome: TimeoutRetryResult["clientOutcome"],
  retryPolicy: TimeoutRetryInput["retryPolicy"],
): readonly Explanation[] {
  return [
    {
      title: "Timeout ambiguity",
      mechanism:
        "A missing response hides whether the server committed the request or rejected it.",
      tradeoff:
        "Waiting for a definitive response can increase user-visible delay, while treating a timeout as failure can create an incorrect recovery decision.",
      failureMode:
        clientOutcome === "unknown-after-timeout"
          ? "The client must preserve an unknown outcome instead of silently reporting failure."
          : "A later response resolved the client-visible outcome in this run.",
      eventSequences: [1, 2, 3, 4],
    },
    {
      title: "Retry policy",
      mechanism:
        "A bounded retry policy repeats an ambiguous request only after the client observes a timeout.",
      tradeoff:
        "Retries can improve completion when the response was lost, but can repeat a committed effect without idempotency.",
      failureMode:
        retryPolicy === "retry-timeout"
          ? "Repeated committed attempts may create duplicate business effects."
          : "No retry avoids duplicate attempts but leaves the client with an unresolved outcome.",
      eventSequences: [],
    },
  ];
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
