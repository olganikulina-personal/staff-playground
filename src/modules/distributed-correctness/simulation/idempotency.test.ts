import { describe, expect, it } from "vitest";

import { simulateIdempotency } from "./idempotency";

describe("idempotency scenarios", () => {
  it("can repeat a business effect when repeated requests have no stable key", () => {
    const result = simulateIdempotency({
      operationId: "payment-1",
      requestCount: 2,
    });

    expect(result.businessEffectCount).toBe(2);
    expect(result.duplicateSuppressedCount).toBe(0);
    expect(result.events.map((event) => event.kind)).toEqual([
      "request-received",
      "business-effect-applied",
      "request-received",
      "business-effect-applied",
    ]);
  });

  it("suppresses repeated business effects for a stable idempotency key", () => {
    const result = simulateIdempotency({
      operationId: "payment-1",
      requestCount: 2,
      idempotencyKey: "payment-1-attempts",
    });

    expect(result.businessEffectCount).toBe(1);
    expect(result.duplicateSuppressedCount).toBe(1);
    expect(result.events.at(-1)?.kind).toBe("duplicate-suppressed");
  });
});
