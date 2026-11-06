import type { TimelineEvent } from "../../../simulations/types";
import type {
  DeliverySemanticsInput,
  DeliverySemanticsResult,
} from "../model/types";

export function simulateDeliverySemantics(
  input: DeliverySemanticsInput,
): DeliverySemanticsResult {
  validateInput(input);

  const attemptLimit =
    input.deliveryMode === "at-most-once"
      ? Math.min(input.deliveryPlan.length, 1)
      : input.deliveryPlan.length;
  const events: TimelineEvent[] = [];
  let messageDelivered = false;
  let businessEffectCount = 0;
  let duplicateDeliveryCount = 0;
  let duplicateSuppressedCount = 0;

  input.deliveryPlan.slice(0, attemptLimit).forEach((deliveryOutcome, index) => {
    events.push(
      makeEvent(
        events.length + 1,
        "delivery-attempted",
        "Delivery attempted",
        `Attempt ${index + 1} was evaluated under ${input.deliveryMode} semantics.`,
      ),
    );

    if (deliveryOutcome === "lost") {
      events.push(
        makeEvent(
          events.length + 1,
          "delivery-lost",
          "Delivery lost",
          `Message ${input.messageId} was not observed by the consumer.`,
        ),
      );
      return;
    }

    events.push(
      makeEvent(
        events.length + 1,
        "delivery-delivered",
        "Delivery delivered",
        `Message ${input.messageId} reached the consumer.`,
      ),
    );

    if (messageDelivered) {
      duplicateDeliveryCount += 1;
      events.push(
        makeEvent(
          events.length + 1,
          "duplicate-delivery-observed",
          "Duplicate delivery observed",
          "The same message identity was delivered again.",
        ),
      );
      if (input.deliveryMode === "effectively-once" && input.consumerIdempotent) {
        duplicateSuppressedCount += 1;
        events.push(
          makeEvent(
            events.length + 1,
            "duplicate-effect-suppressed",
            "Duplicate effect suppressed",
            "Consumer idempotency preserved one modeled business effect.",
          ),
        );
        return;
      }
    }

    messageDelivered = true;
    businessEffectCount += 1;
    events.push(
      makeEvent(
        events.length + 1,
        "business-effect-applied",
        "Business effect applied",
        `The consumer applied business effect ${businessEffectCount}.`,
      ),
    );
  });

  return {
    deliveryAttemptCount: attemptLimit,
    messageDelivered,
    businessEffectCount,
    duplicateDeliveryCount,
    duplicateSuppressedCount,
    events,
    explanations: [
      {
        title: "Delivery semantics",
        mechanism: describeMechanism(input),
        tradeoff: describeTradeoff(input),
        failureMode: describeFailureMode(input),
        eventSequences: events.map((event) => event.sequence),
      },
    ],
  };
}

function validateInput(input: DeliverySemanticsInput): void {
  if (!input.messageId.trim()) {
    throw new RangeError("Message id must not be empty");
  }

  if (input.deliveryPlan.length === 0) {
    throw new RangeError("Delivery plan must contain at least one outcome");
  }
}

function describeMechanism(input: DeliverySemanticsInput): string {
  switch (input.deliveryMode) {
    case "at-most-once":
      return "The sender makes one modeled delivery attempt and does not retry after loss.";
    case "at-least-once":
      return "The sender retries according to the modeled delivery plan, so the consumer may observe duplicates.";
    case "effectively-once":
      return "At-least-once delivery is combined with consumer idempotency to preserve one modeled business effect.";
  }
}

function describeTradeoff(input: DeliverySemanticsInput): string {
  switch (input.deliveryMode) {
    case "at-most-once":
      return "Fewer duplicate effects are traded for possible message loss.";
    case "at-least-once":
      return "Delivery durability is traded for duplicate handling at the consumer.";
    case "effectively-once":
      return "Application-level deduplication is traded for durable identity state and retry-aware consumers.";
  }
}

function describeFailureMode(input: DeliverySemanticsInput): string {
  switch (input.deliveryMode) {
    case "at-most-once":
      return "A lost first attempt remains lost because this mode does not retry.";
    case "at-least-once":
      return "The consumer must tolerate duplicate deliveries and repeated effects.";
    case "effectively-once":
      return "Transport can still lose or redeliver messages; exactly-once transport is not claimed.";
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
