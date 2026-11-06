import { describe, expect, it } from "vitest";

import {
  simulateTimeoutRetry,
  type TimeoutRetryInput,
} from "./timeout";

const committedResponseLost: TimeoutRetryInput = {
  operationId: "charge-42",
  commitOutcome: "committed",
  responsePlan: ["lost"],
  retryPolicy: "none",
  maxAttempts: 1,
};

describe("timeout and retry scenarios", () => {
  it("preserves an unknown client outcome when a committed response is lost", () => {
    const result = simulateTimeoutRetry(committedResponseLost);

    expect(result.clientOutcome).toBe("unknown-after-timeout");
    expect(result.serverCommitState).toBe("committed");
    expect(result.businessEffectCount).toBe(1);
    expect(result.events.map((event) => event.kind)).toEqual([
      "request-attempted",
      "server-committed",
      "response-lost",
      "client-timeout",
    ]);
  });

  it("bounds retries and exposes repeated committed business effects", () => {
    const result = simulateTimeoutRetry({
      operationId: "charge-42",
      commitOutcome: "committed",
      responsePlan: ["lost", "lost", "lost"],
      retryPolicy: "retry-timeout",
      maxAttempts: 3,
    });

    expect(result.clientOutcome).toBe("unknown-after-timeout");
    expect(result.attemptCount).toBe(3);
    expect(result.businessEffectCount).toBe(3);
    expect(result.events.filter((event) => event.kind === "retry-attempted")).toHaveLength(2);
  });

  it("reports a known rejection when a rejection response is delivered", () => {
    const result = simulateTimeoutRetry({
      operationId: "charge-43",
      commitOutcome: "rejected",
      responsePlan: ["delivered"],
      retryPolicy: "retry-timeout",
      maxAttempts: 3,
    });

    expect(result.clientOutcome).toBe("known-rejection");
    expect(result.serverCommitState).toBe("rejected");
    expect(result.businessEffectCount).toBe(0);
    expect(result.attemptCount).toBe(1);
  });

  it("replays identical input deterministically", () => {
    const input: TimeoutRetryInput = {
      operationId: "charge-44",
      commitOutcome: "committed",
      responsePlan: ["lost", "delivered"],
      retryPolicy: "retry-timeout",
      maxAttempts: 2,
    };

    expect(simulateTimeoutRetry(input)).toEqual(simulateTimeoutRetry(input));
  });
});
