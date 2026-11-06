import { describe, expect, it } from "vitest";

import {
  DEFAULT_DISTRIBUTED_PARAMETERS,
  runDistributedCorrectnessScenario,
  type DistributedScenarioId,
} from "./labRunner";

const scenarios: readonly DistributedScenarioId[] = [
  "timeout-ambiguity",
  "retry-policy",
  "idempotency",
  "transactional-outbox",
  "reconciliation",
  "delivery-semantics",
];

describe("distributed correctness lab runner", () => {
  it.each(scenarios)("runs the %s scenario with observations and teaching content", (scenario) => {
    const result = runDistributedCorrectnessScenario({
      ...DEFAULT_DISTRIBUTED_PARAMETERS,
      scenario,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.events.length).toBeGreaterThan(0);
      expect(result.result.observations.length).toBeGreaterThan(0);
      expect(result.result.explanations.length).toBeGreaterThan(0);
      expect(result.result.decisionQuestion.options.length).toBeGreaterThan(1);
    }
  });

  it("reports invalid retry parameters instead of silently coercing them", () => {
    const result = runDistributedCorrectnessScenario({
      ...DEFAULT_DISTRIBUTED_PARAMETERS,
      scenario: "retry-policy",
      maxAttempts: 0,
    });

    expect(result).toEqual({
      ok: false,
      error: expect.stringMatching(/maximum attempts/i),
    });
  });
});
