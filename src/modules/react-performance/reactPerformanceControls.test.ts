import { describe, expect, it } from "vitest";

import {
  createReactPerformanceParameterFields,
  updateReactPerformanceParameters,
} from "./reactPerformanceControls";
import { DEFAULT_REACT_PERFORMANCE_PARAMETERS } from "./labRunner";

describe("React Performance parameter controls", () => {
  it("exposes scenario, variant, workload, and runtime controls", () => {
    const fields = createReactPerformanceParameterFields(
      DEFAULT_REACT_PERFORMANCE_PARAMETERS,
    );
    const fieldIds = fields.map((field) => field.id);

    expect(fieldIds).toEqual(
      expect.arrayContaining([
        "scenario",
        "renderVariant",
        "computationVariant",
        "workerVariant",
        "responsivenessVariant",
        "parentUpdateCount",
        "computationSize",
        "seed",
        "runtimeMode",
        "strictMode",
      ]),
    );
  });

  it("updates typed numeric, boolean, and scenario values", () => {
    const withSize = updateReactPerformanceParameters(
      DEFAULT_REACT_PERFORMANCE_PARAMETERS,
      "computationSize",
      "256",
    );
    const withStrictMode = updateReactPerformanceParameters(
      withSize,
      "strictMode",
      "true",
    );
    const withScenario = updateReactPerformanceParameters(
      withStrictMode,
      "scenario",
      "worker-offload",
    );

    expect(withScenario.computationSize).toBe(256);
    expect(withScenario.strictMode).toBe(true);
    expect(withScenario.scenario).toBe("worker-offload");
  });

  it("resets to safe defaults for unknown fields", () => {
    expect(
      updateReactPerformanceParameters(
        DEFAULT_REACT_PERFORMANCE_PARAMETERS,
        "unknown",
        "value",
      ),
    ).toEqual(DEFAULT_REACT_PERFORMANCE_PARAMETERS);
  });
});
