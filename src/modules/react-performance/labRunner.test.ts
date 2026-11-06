import { describe, expect, it } from "vitest";

import {
  DEFAULT_REACT_PERFORMANCE_PARAMETERS,
  runReactPerformanceScenario,
  type PerformanceScenarioId,
} from "./labRunner";
import {
  createMeasurementBuffer,
  finalizeMeasurementBuffer,
  recordEvidence,
} from "./measurement/buffer";

const scenarios: readonly PerformanceScenarioId[] = [
  "render-propagation",
  "derived-computation",
  "worker-offload",
  "responsiveness",
];

describe("React Performance lab runner", () => {
  it.each(scenarios)("summarizes the %s scenario with teaching content", (scenario) => {
    const buffer = createMeasurementBuffer();

    recordEvidence(buffer, {
      kind: "measured-in-browser",
      metric: "work-duration",
      value: 4,
      unit: "milliseconds",
    });

    const result = runReactPerformanceScenario(
      { ...DEFAULT_REACT_PERFORMANCE_PARAMETERS, scenario },
      { snapshot: finalizeMeasurementBuffer(buffer) },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.scenario).toBe(scenario);
      expect(result.result.observations.length).toBeGreaterThan(0);
      expect(result.result.evidence).toHaveLength(1);
      expect(result.result.explanations.length).toBeGreaterThan(0);
      expect(result.result.decisionQuestion.options.length).toBeGreaterThan(1);
      expect(result.result.caveat).toMatch(/browser|benchmark/i);
    }
  });

  it("preserves unsupported evidence instead of converting it to zero", () => {
    const buffer = createMeasurementBuffer();
    recordEvidence(buffer, {
      kind: "unsupported",
      metric: "input-delay",
      reason: "No input timestamp was available.",
    });

    const result = runReactPerformanceScenario(
      {
        ...DEFAULT_REACT_PERFORMANCE_PARAMETERS,
        scenario: "responsiveness",
      },
      { snapshot: finalizeMeasurementBuffer(buffer) },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.evidence).toEqual([
        {
          kind: "unsupported",
          metric: "input-delay",
          reason: "No input timestamp was available.",
        },
      ]);
      expect(result.result.observations).toContainEqual({
        label: "Input delay",
        value: "Unsupported: No input timestamp was available.",
      });
    }
  });

  it("formats measured timing evidence without exposing floating-point noise", () => {
    const buffer = createMeasurementBuffer();
    recordEvidence(buffer, {
      kind: "measured-in-browser",
      metric: "worker-round-trip",
      value: 75.79999995231628,
      unit: "milliseconds",
    });

    const result = runReactPerformanceScenario(
      {
        ...DEFAULT_REACT_PERFORMANCE_PARAMETERS,
        scenario: "worker-offload",
      },
      { snapshot: finalizeMeasurementBuffer(buffer) },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.observations).toContainEqual({
        label: "Worker round trip",
        value: "75.80 ms",
      });
    }
  });

  it("collapses repeated evidence metrics into one observation", () => {
    const buffer = createMeasurementBuffer();
    recordEvidence(buffer, {
      kind: "measured-in-browser",
      metric: "calculation-count",
      value: 1,
      unit: "count",
    });
    recordEvidence(buffer, {
      kind: "measured-in-browser",
      metric: "calculation-count",
      value: 2,
      unit: "count",
    });

    const result = runReactPerformanceScenario(
      {
        ...DEFAULT_REACT_PERFORMANCE_PARAMETERS,
        scenario: "derived-computation",
      },
      { snapshot: finalizeMeasurementBuffer(buffer) },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(
        result.result.observations.filter(
          (observation) => observation.label === "Calculation count",
        ),
      ).toEqual([{ label: "Calculation count", value: "2" }]);
    }
  });

  it("reports invalid workload parameters instead of silently coercing them", () => {
    const buffer = createMeasurementBuffer();

    expect(
      runReactPerformanceScenario(
        {
          ...DEFAULT_REACT_PERFORMANCE_PARAMETERS,
          computationSize: 0,
        },
        { snapshot: finalizeMeasurementBuffer(buffer) },
      ),
    ).toEqual({
      ok: false,
      error: expect.stringMatching(/computationSize/i),
    });
  });
});
