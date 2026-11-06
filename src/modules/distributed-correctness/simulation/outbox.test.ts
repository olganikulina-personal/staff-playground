import { describe, expect, it } from "vitest";

import { simulateOutboxDelivery } from "./outbox";

describe("transactional outbox scenarios", () => {
  it("commits business state and the outbox record together", () => {
    const result = simulateOutboxDelivery({
      operationId: "order-1",
      businessCommitOutcome: "committed",
      deliveryPlan: [],
      consumerIdempotent: true,
    });

    expect(result.businessStateCommitted).toBe(true);
    expect(result.outboxRecordCreated).toBe(true);
    expect(result.events.map((event) => event.kind)).toEqual([
      "business-state-committed",
      "outbox-record-created",
    ]);
  });

  it("does not create an outbox record when the business transaction rejects", () => {
    const result = simulateOutboxDelivery({
      operationId: "order-2",
      businessCommitOutcome: "rejected",
      deliveryPlan: ["delivered"],
      consumerIdempotent: true,
    });

    expect(result.businessStateCommitted).toBe(false);
    expect(result.outboxRecordCreated).toBe(false);
    expect(result.consumerEffectCount).toBe(0);
    expect(result.events.map((event) => event.kind)).toEqual([
      "business-transaction-rejected",
    ]);
  });

  it("makes duplicate delivery safe when the consumer is idempotent", () => {
    const result = simulateOutboxDelivery({
      operationId: "order-3",
      businessCommitOutcome: "committed",
      deliveryPlan: ["delivered", "delivered"],
      consumerIdempotent: true,
    });

    expect(result.consumerEffectCount).toBe(1);
    expect(result.duplicateDeliveryCount).toBe(1);
    expect(result.events.map((event) => event.kind)).toContain(
      "consumer-duplicate-suppressed",
    );
  });

  it("exposes duplicate consumer effects without idempotent handling", () => {
    const result = simulateOutboxDelivery({
      operationId: "order-4",
      businessCommitOutcome: "committed",
      deliveryPlan: ["delivered", "delivered"],
      consumerIdempotent: false,
    });

    expect(result.consumerEffectCount).toBe(2);
    expect(result.duplicateDeliveryCount).toBe(1);
  });
});
