import type { Explanation, TimelineEvent } from "../../../simulations/types";
import type {
  OutboxDeliveryInput,
  OutboxDeliveryResult,
} from "../model/types";

export function simulateOutboxDelivery(
  input: OutboxDeliveryInput,
): OutboxDeliveryResult {
  validateInput(input);

  const events: TimelineEvent[] = [];
  if (input.businessCommitOutcome === "rejected") {
    events.push(
      makeEvent(
        1,
        "business-transaction-rejected",
        "Business transaction rejected",
        "No business state or outbox record was committed.",
      ),
    );
    return {
      businessStateCommitted: false,
      outboxRecordCreated: false,
      deliveryAttemptCount: 0,
      consumerEffectCount: 0,
      duplicateDeliveryCount: 0,
      events,
      explanations: createExplanations(input.consumerIdempotent),
    };
  }

  events.push(
    makeEvent(
      1,
      "business-state-committed",
      "Business state committed",
      `The business transaction committed operation ${input.operationId}.`,
    ),
    makeEvent(
      2,
      "outbox-record-created",
      "Outbox record created",
      "The outbox record committed in the same local transaction as business state.",
    ),
  );

  let consumerEffectCount = 0;
  let duplicateDeliveryCount = 0;
  let messageDelivered = false;

  input.deliveryPlan.forEach((deliveryOutcome, index) => {
    events.push(
      makeEvent(
        events.length + 1,
        "delivery-attempted",
        "Outbox delivery attempted",
        `Delivery attempt ${index + 1} started for the committed outbox record.`,
      ),
    );

    if (deliveryOutcome === "lost") {
      events.push(
        makeEvent(
          events.length + 1,
          "delivery-lost",
          "Outbox delivery lost",
          "The consumer did not observe this delivery attempt.",
        ),
      );
      return;
    }

    events.push(
      makeEvent(
        events.length + 1,
        "delivery-delivered",
        "Outbox delivery delivered",
        "The consumer observed the outbox message.",
      ),
    );

    if (messageDelivered) {
      duplicateDeliveryCount += 1;
      events.push(
        makeEvent(
          events.length + 1,
          "consumer-duplicate-delivery",
          "Duplicate delivery observed",
          "The consumer received the same outbox message identity again.",
        ),
      );
      if (input.consumerIdempotent) {
        events.push(
          makeEvent(
            events.length + 1,
            "consumer-duplicate-suppressed",
            "Consumer duplicate suppressed",
            "The consumer retained one business effect for the repeated message.",
          ),
        );
        return;
      }
    }

    messageDelivered = true;
    consumerEffectCount += 1;
    events.push(
      makeEvent(
        events.length + 1,
        "consumer-effect-applied",
        "Consumer effect applied",
        `The consumer applied business effect ${consumerEffectCount}.`,
      ),
    );
  });

  return {
    businessStateCommitted: true,
    outboxRecordCreated: true,
    deliveryAttemptCount: input.deliveryPlan.length,
    consumerEffectCount,
    duplicateDeliveryCount,
    events,
    explanations: createExplanations(input.consumerIdempotent),
  };
}

function validateInput(input: OutboxDeliveryInput): void {
  if (!input.operationId.trim()) {
    throw new RangeError("Operation id must not be empty");
  }
}

function createExplanations(
  consumerIdempotent: boolean,
): readonly Explanation[] {
  return [
    {
      title: "Transactional outbox",
      mechanism:
        "Business state and an outbox record share one local commit boundary, while delivery happens asynchronously.",
      tradeoff:
        "The outbox preserves a durable delivery intent but requires retry handling and cleanup.",
      failureMode:
        "A delivery can be lost or repeated after the local transaction has already committed.",
      eventSequences: [],
    },
    {
      title: "Duplicate-safe consumption",
      mechanism:
        "A consumer can use the stable message identity to make repeated deliveries a no-op.",
      tradeoff:
        "Consumer-side deduplication requires durable identity tracking and does not eliminate transport retries.",
      failureMode: consumerIdempotent
        ? "A broken or expired deduplication record can reapply a message."
        : "Repeated delivery can apply duplicate business effects.",
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
