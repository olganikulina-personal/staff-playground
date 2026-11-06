import { describe, expect, it } from "vitest";

import {
  compareRunSnapshots,
  createRunSnapshot,
  replayRunSnapshot,
  resetScenario,
} from "./lifecycle";
import type {
  DecisionQuestion,
  Explanation,
  TimelineEvent,
} from "./types";

const events: readonly TimelineEvent[] = [
  {
    sequence: 1,
    kind: "request-routed",
    label: "Request routed",
    detail: "The request was sent to the selected target.",
    simulated: true,
  },
];

const explanations: readonly Explanation[] = [
  {
    title: "Routing mechanism",
    mechanism: "A routing rule selects the target.",
    tradeoff: "Centralized routing adds coordination.",
    failureMode: "A stale route can target an unavailable node.",
    eventSequences: [1],
  },
];

const decisionQuestion: DecisionQuestion = {
  prompt: "Which trade-off matters most here?",
  options: ["Lower latency", "Stronger consistency"],
  reasoningFocus: "Connect the selected option to the failure mode.",
};

describe("simulation lifecycle contracts", () => {
  it("creates an immutable run snapshot with the educational result metadata", () => {
    const snapshot = createRunSnapshot({
      runId: "run-1",
      scenarioId: "database-routing",
      seed: 7,
      parameters: { nodeCount: 3 },
      result: { availableNodes: 3 },
      events,
      explanations,
      decisionQuestion,
    });

    expect(snapshot.scenarioId).toBe("database-routing");
    expect(snapshot.events).toEqual(events);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.events)).toBe(true);
  });

  it("replays the existing snapshot without executing or changing its event sequence", () => {
    const snapshot = createRunSnapshot({
      runId: "run-1",
      scenarioId: "database-routing",
      seed: 7,
      parameters: { nodeCount: 3 },
      result: { availableNodes: 3 },
      events,
      explanations,
      decisionQuestion,
    });

    const replay = replayRunSnapshot(snapshot);

    expect(replay.mode).toBe("replay");
    expect(replay.snapshot).toBe(snapshot);
    expect(replay.snapshot.events).toBe(snapshot.events);
  });

  it("compares immutable runs and reports parameter changes through a caller-owned result diff", () => {
    const first = createRunSnapshot({
      runId: "run-1",
      scenarioId: "database-routing",
      seed: 7,
      parameters: { nodeCount: 3 },
      result: { availableNodes: 3 },
      events,
      explanations,
    });
    const second = createRunSnapshot({
      runId: "run-2",
      scenarioId: "database-routing",
      seed: 7,
      parameters: { nodeCount: 4 },
      result: { availableNodes: 4 },
      events,
      explanations,
    });

    const comparison = compareRunSnapshots(first, second, {
      resultDiff: {
        availableNodes: [3, 4],
      },
    });

    expect(comparison.sameScenario).toBe(true);
    expect(comparison.parameterChanges).toEqual(["nodeCount"]);
    expect(comparison.resultDiff).toEqual({ availableNodes: [3, 4] });
    expect(first.parameters).toEqual({ nodeCount: 3 });
    expect(second.parameters).toEqual({ nodeCount: 4 });
  });

  it("resets to defaults and clears the active run", () => {
    expect(
      resetScenario({
        nodeCount: 3,
        distribution: "even",
      }),
    ).toEqual({
      mode: "reset",
      parameters: {
        nodeCount: 3,
        distribution: "even",
      },
      activeRun: null,
    });
  });
});
