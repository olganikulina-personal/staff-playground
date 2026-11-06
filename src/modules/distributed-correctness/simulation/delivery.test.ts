import { describe, expect, it } from "vitest";

import { simulateDeliverySemantics } from "./delivery";

describe("delivery semantics scenarios", () => {
  it("models at-most-once as possible loss without retries", () => {
    const result = simulateDeliverySemantics({
      messageId: "message-1",
      deliveryMode: "at-most-once",
      deliveryPlan: ["lost", "delivered"],
      consumerIdempotent: false,
    });

    expect(result.deliveryAttemptCount).toBe(1);
    expect(result.businessEffectCount).toBe(0);
    expect(result.messageDelivered).toBe(false);
  });

  it("models at-least-once as duplicate-capable delivery", () => {
    const result = simulateDeliverySemantics({
      messageId: "message-2",
      deliveryMode: "at-least-once",
      deliveryPlan: ["lost", "delivered", "delivered"],
      consumerIdempotent: false,
    });

    expect(result.messageDelivered).toBe(true);
    expect(result.businessEffectCount).toBe(2);
    expect(result.duplicateDeliveryCount).toBe(1);
  });

  it("models effectively-once as idempotent application handling", () => {
    const result = simulateDeliverySemantics({
      messageId: "message-3",
      deliveryMode: "effectively-once",
      deliveryPlan: ["lost", "delivered", "delivered"],
      consumerIdempotent: true,
    });

    expect(result.businessEffectCount).toBe(1);
    expect(result.duplicateDeliveryCount).toBe(1);
    expect(result.duplicateSuppressedCount).toBe(1);
    expect(result.explanations[0]?.failureMode).toMatch(/transport/i);
  });
});
